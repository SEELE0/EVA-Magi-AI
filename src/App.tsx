import { useEffect, useMemo, useState } from 'react';
import type { Agent, AgentId, Decision, DecisionEvent, DecisionRequest, SystemStatus, Verdict, Vote } from './domain';
import { createDecisionService } from './services';
import type { DecisionService } from './services/decision-service';

const service: DecisionService = createDecisionService();

const defaultAgents: Agent[] = [
  { id: 'MELCHIOR-1', role: '科学者論理', health: 'nominal', latencyMs: 18, vote: 'pending' },
  { id: 'BALTHASAR-2', role: '母性論理', health: 'nominal', latencyMs: 24, vote: 'pending' },
  { id: 'CASPER-3', role: '女性論理', health: 'nominal', latencyMs: 21, vote: 'pending' }
];

const verdictCopy: Record<Verdict, { label: string; detail: string }> = {
  pending: { label: '入力待機', detail: '議題パケットを待機中' },
  approved: { label: '承認', detail: '多数決により実行を承認' },
  rejected: { label: '否決', detail: '多数決により実行を否決' },
  review: { label: '要再審', detail: '有効な多数決が成立せず' }
};

const voteCopy: Record<Vote, string> = {
  pending: '待機',
  approve: '承認',
  reject: '否決',
  abstain: '棄権'
};

const connectionCopy: Record<SystemStatus['connection'], string> = {
  online: '正常',
  degraded: '警戒',
  offline: '遮断'
};

const sourceCopy: Record<SystemStatus['source'], string> = {
  mock: '模擬系',
  remote: '外部系'
};

const healthCopy: Record<Agent['health'], string> = {
  nominal: '正常',
  degraded: '警戒',
  offline: '遮断'
};

type Scenario = 'standard' | 'reject' | 'review';

const scenarioSubject: Record<Scenario, string> = {
  standard: '第07区防衛プロトコルの更新を承認',
  reject: '【否決】未承認の外部接続申請',
  review: '【保留】観測プロトコルの起動可否'
};

function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [events, setEvents] = useState<DecisionEvent[]>([]);
  const [subject, setSubject] = useState(scenarioSubject.standard);
  const [priority, setPriority] = useState<DecisionRequest['priority']>('critical');
  const [scenario, setScenario] = useState<Scenario>('standard');
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([service.getSystemStatus(), service.getAgents()])
      .then(([nextStatus, nextAgents]) => {
        setStatus(nextStatus);
        setAgents(nextAgents);
      })
      .catch(() => setError('起動シーケンスが中断されました'));
  }, []);

  const activeVotes = useMemo(() => decision?.votes ?? null, [decision]);
  const selectedVerdict = decision?.verdict ?? 'pending';

  function selectScenario(nextScenario: Scenario) {
    setScenario(nextScenario);
    setSubject(scenarioSubject[nextScenario]);
  }

  async function runDecision() {
    if (!subject.trim()) {
      setError('MAGIに送信する議題を入力してください。');
      return;
    }
    setError(null);
    setIsExecuting(true);
    setEvents([]);
    try {
      const created = await service.createDecision({ subject, priority, simulationHint: scenario });
      setDecision(created);
      setEvents(await service.getEvents(created.id));
      const execution = service.executeDecision(created.id);

      // Polling keeps the client compatible with the documented REST event endpoint.
      const poll = window.setInterval(async () => {
        const [latestDecision, latestEvents] = await Promise.all([
          service.getDecision(created.id),
          service.getEvents(created.id)
        ]);
        setDecision(latestDecision);
        setEvents(latestEvents);
      }, 220);

      const completed = await execution;
      window.clearInterval(poll);
      setDecision(completed);
      setEvents(await service.getEvents(created.id));
      setStatus(await service.getSystemStatus());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '判定回線に障害が発生しました');
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <main className="crt-shell">
      <div className="screen-noise" aria-hidden="true" />
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark">M</span>
          <div>
            <p className="eyebrow">NERV 中央教義 / 判定階層</p>
            <h1>MAGI <span>判定システム</span></h1>
          </div>
        </div>
        <div className="header-readout">
          <Readout label="回線" value={status ? connectionCopy[status.connection] : '起動中'} tone={status?.connection ?? 'offline'} />
          <Readout label="系統" value={status ? sourceCopy[status.source] : 'ローカル'} tone="online" />
          <Readout label="時刻" value={new Date().toLocaleTimeString('ja-JP', { hour12: false })} tone="online" />
        </div>
      </header>

      <section className="command-strip" aria-label="システム通知">
        <span className="signal-dot" />
        <span>{status?.notice ?? '神経接続を確立中...'}</span>
        <span className="protocol">{status?.protocol ?? 'MAGI/3.0'}</span>
      </section>

      <section className="console-grid">
        <aside className="telemetry-panel panel-frame">
          <PanelTitle index="01" label="システム監視" />
          <div className="telemetry-stack">
            <Telemetry label="中枢温度" value="37.2 C" level={72} />
            <Telemetry label="判定バス" value="安定" level={91} />
            <Telemetry label="神経負荷" value={isExecuting ? '86%' : '18%'} level={isExecuting ? 86 : 18} />
            <Telemetry label="同期率" value="99.982%" level={99} />
          </div>
          <div className="panel-rule" />
          <div className="system-record">
            <span>セッション</span>
            <strong>{decision?.id ?? '待機'}</strong>
            <span>稼働時間</span>
            <strong>{status ? `${status.uptimeSeconds}s` : '--'}</strong>
          </div>
        </aside>

        <section className="decision-stage panel-frame" aria-label="MAGI 合議マトリクス">
          <PanelTitle index="02" label="合議マトリクス" />
          <div className={`magi-network ${isExecuting ? 'is-scanning' : ''}`}>
            <svg className="network-links" viewBox="0 0 600 420" preserveAspectRatio="none" aria-hidden="true">
              <line x1="270.2" y1="175.3" x2="182.2" y2="212.7" vectorEffect="non-scaling-stroke" />
              <line x1="329.8" y1="175.3" x2="417.8" y2="212.7" vectorEffect="non-scaling-stroke" />
              <line x1="264" y1="333.8" x2="336" y2="333.8" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="core-node">
              <span>MAGI</span>
              <small>第03中枢</small>
            </div>
            {agents.map((agent) => (
              <AgentNode
                key={agent.id}
                agent={agent}
                vote={activeVotes?.[agent.id] ?? 'pending'}
                position={agent.id === 'BALTHASAR-2' ? 'top' : agent.id === 'CASPER-3' ? 'left' : 'right'}
              />
            ))}
          </div>
          <div className={`verdict-bar verdict-${selectedVerdict}`}>
            <span>最終判定</span>
            <strong>{verdictCopy[selectedVerdict].label}</strong>
            <small>{verdictCopy[selectedVerdict].detail}</small>
          </div>
        </section>

        <aside className="event-panel panel-frame">
          <PanelTitle index="03" label="事象ログ" />
          <ol className="event-list" aria-live="polite">
            {events.length === 0 ? (
              <li className="event-empty">送信記録なし</li>
            ) : events.map((event) => (
              <li key={event.id} className={`event-${event.kind}`}>
                <time>{new Date(event.timestamp).toLocaleTimeString('ja-JP', { hour12: false })}</time>
                <span>{event.message}</span>
              </li>
            ))}
          </ol>
          <div className="trace-footer">REST 監視 / 220ms</div>
        </aside>
      </section>

      <section className="input-deck panel-frame">
        <div className="deck-heading">
          <PanelTitle index="04" label="判定パケット入力" />
          <div className="scenario-controls" aria-label="模擬シナリオ">
            {(['standard', 'reject', 'review'] as Scenario[]).map((item) => (
              <button
                className={scenario === item ? 'selected' : ''}
                type="button"
                key={item}
                onClick={() => selectScenario(item)}
                disabled={isExecuting}
              >
                {item === 'standard' ? '標準経路' : item === 'reject' ? '否決経路' : '保留経路'}
              </button>
            ))}
          </div>
        </div>
        <div className="command-form">
          <label className="subject-field">
            <span>議題</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={90}
              disabled={isExecuting}
              aria-label="判定議題"
            />
          </label>
          <label className="priority-field">
            <span>優先度</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value as DecisionRequest['priority'])} disabled={isExecuting}>
              <option value="low">低</option>
              <option value="normal">通常</option>
              <option value="critical">最優先</option>
            </select>
          </label>
          <button className="execute-button" type="button" onClick={() => void runDecision()} disabled={isExecuting}>
            {isExecuting ? '判定中...' : '判定開始'}
          </button>
        </div>
        {error && <p className="error-line">// {error}</p>}
      </section>

      <footer className="footer-line">
        <span>MAGI-OS / VER 0.1.0</span>
        <span>三つの心、一つの判定。</span>
        <span>権限：操縦者</span>
      </footer>
    </main>
  );
}

function Readout({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className={`readout ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function PanelTitle({ index, label }: { index: string; label: string }) {
  return <h2 className="panel-title"><span>{index}</span>{label}</h2>;
}

function Telemetry({ label, value, level }: { label: string; value: string; level: number }) {
  return (
    <div className="telemetry-row">
      <div><span>{label}</span><strong>{value}</strong></div>
      <span className="meter"><i style={{ width: `${level}%` }} /></span>
    </div>
  );
}

function AgentNode({ agent, vote, position }: { agent: Agent; vote: Vote; position: 'top' | 'left' | 'right' }) {
  return (
    <article className={`agent-node ${position} vote-${vote}`}>
      <div className="agent-tag">{agent.role}</div>
      <strong>{agent.id}</strong>
      <span className="vote-state">{voteCopy[vote]}</span>
      <small>{healthCopy[agent.health]} / {agent.latencyMs}ms</small>
    </article>
  );
}

export default App;
