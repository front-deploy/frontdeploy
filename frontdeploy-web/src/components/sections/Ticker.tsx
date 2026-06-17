export function Ticker() {
  return (
    <div className="ticker-section">
      <div className="ticker-track">
        <span className="ticker-item">$SORA</span>
        <span className="ticker-item">
          <em>Intelligence</em>
        </span>
        <span className="ticker-item">pump.fun</span>
        <span className="ticker-item">
          <em>Solana</em>
        </span>
        <span className="ticker-item">Launch Radar</span>
        <span className="ticker-item">
          <em>Axiom</em>
        </span>
        {/* Duplicated for seamless infinite scroll */}
        <span className="ticker-item">$SORA</span>
        <span className="ticker-item">
          <em>Intelligence</em>
        </span>
        <span className="ticker-item">pump.fun</span>
        <span className="ticker-item">
          <em>Solana</em>
        </span>
        <span className="ticker-item">Launch Radar</span>
        <span className="ticker-item">
          <em>Axiom</em>
        </span>
      </div>
    </div>
  );
}
