import type {
  EventFrame,
  ChatEvent,
  AgentEvent,
  MonitorSession,
  MonitorAction,
  SessionInfo,
} from './protocol'
import { parseSessionKey } from './protocol'

export function sessionInfoToMonitor(info: SessionInfo): MonitorSession {
  const parsed = parseSessionKey(info.key)
  return {
    key: info.key,
    agentId: parsed.agentId,
    platform: parsed.platform,
    recipient: parsed.recipient,
    isGroup: parsed.isGroup,
    lastActivityAt: info.lastActivityAt,
    status: 'idle',
  }
}

export function chatEventToAction(event: ChatEvent): MonitorAction {
  const action: MonitorAction = {
    id: `${event.runId}-${event.seq}`,
    runId: event.runId,
    sessionKey: event.sessionKey,
    seq: event.seq,
    type: event.state,
    eventType: 'chat',
    timestamp: Date.now(),
  }

  if (event.message) {
    if (typeof event.message === 'string') {
      action.content = event.message
    } else if (typeof event.message === 'object') {
      const msg = event.message as Record<string, unknown>

      // Extract text from content blocks: [{type: 'text', text: '...'}]
      if (Array.isArray(msg.content)) {
        const texts: string[] = []
        for (const block of msg.content) {
          if (typeof block === 'object' && block) {
            const b = block as Record<string, unknown>
            if (b.type === 'text' && typeof b.text === 'string') {
              texts.push(b.text)
            } else if (b.type === 'tool_use') {
              action.type = 'tool_call'
              action.toolName = String(b.name || 'unknown')
              action.toolArgs = b.input
            } else if (b.type === 'tool_result') {
              action.type = 'tool_result'
              if (typeof b.content === 'string') {
                texts.push(b.content)
              }
            }
          }
        }
        if (texts.length > 0) {
          action.content = texts.join('')
        }
      } else if (typeof msg.content === 'string') {
        action.content = msg.content
      } else if (typeof msg.text === 'string') {
        action.content = msg.text
      }
    }
  }

  if (event.errorMessage) {
    action.content = event.errorMessage
  }

  return action
}

export function agentEventToAction(event: AgentEvent): MonitorAction {
  const data = event.data

  let type: MonitorAction['type'] = 'delta'
  let content: string | undefined
  let toolName: string | undefined
  let toolArgs: unknown | undefined

  if (data.type === 'tool_use') {
    type = 'tool_call'
    toolName = String(data.name || 'unknown')
    toolArgs = data.input
    content = `Tool: ${toolName}`
  } else if (data.type === 'tool_result') {
    type = 'tool_result'
    content = String(data.content || '')
  } else if (data.type === 'text') {
    type = 'delta'
    content = String(data.text || '')
  }

  return {
    id: `${event.runId}-${event.seq}`,
    runId: event.runId,
    sessionKey: event.stream,
    seq: event.seq,
    type,
    eventType: 'agent' as const,
    timestamp: event.ts,
    content,
    toolName,
    toolArgs,
  }
}

export function parseEventFrame(
  frame: EventFrame
): { session?: Partial<MonitorSession>; action?: MonitorAction } | null {
  if (frame.event === 'chat' && frame.payload) {
    const chatEvent = frame.payload as ChatEvent
    return {
      action: chatEventToAction(chatEvent),
      session: {
        key: chatEvent.sessionKey,
        status: chatEvent.state === 'delta' ? 'thinking' : 'active',
        lastActivityAt: Date.now(),
      },
    }
  }

  if (frame.event === 'agent' && frame.payload) {
    const agentEvent = frame.payload as AgentEvent
    return {
      action: agentEventToAction(agentEvent),
    }
  }

  return null
}
