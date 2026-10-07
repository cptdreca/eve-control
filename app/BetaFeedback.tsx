'use client';

import { useState } from 'react';
import { NewsPanel } from './NewsPanel';

export function BetaFeedback() {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [notice, setNotice] = useState('');

  async function shareFeedback() {
    const text = `Feedback zu EVE Character Control (Web-Beta):\n\n${feedback.trim()}`;
    if (!feedback.trim()) return setNotice('Bitte zuerst dein Feedback eingeben.');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'EVE Character Control – Feedback', text });
        setNotice('Danke fürs Teilen!');
      } else {
        await navigator.clipboard.writeText(text);
        setNotice('Feedback kopiert – du kannst es jetzt über deinen bevorzugten Kanal senden.');
      }
    } catch {
      setNotice('Teilen wurde abgebrochen. Dein Text bleibt erhalten.');
    }
  }

  return <><NewsPanel />
    <button className="feedback-fab" onClick={() => setOpen(true)}>FEEDBACK</button>
    {open && <div className="feedback-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <section className="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="feedback-close" aria-label="Feedback schließen" onClick={() => setOpen(false)}>×</button>
        <p className="section-label">WEB-BETA</p>
        <h2 id="feedback-title">Hilf uns, die App zu verbessern</h2>
        <p>Was funktioniert gut, was fehlt oder wo tritt ein Fehler auf? Es werden dabei keine EVE-Zugangsdaten angefügt.</p>
        <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} maxLength={1500} placeholder="Dein Feedback …" />
        <button className="primary-login" onClick={shareFeedback}>Feedback teilen</button>
        {notice && <small>{notice}</small>}
      </section>
    </div>}
  </>;
}
