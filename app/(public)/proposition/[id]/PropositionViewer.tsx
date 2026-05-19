'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Sun, Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  html: string;
  prospectId: string;
  prenom: string;
  nom: string;
  propositionId: string;
}

export function PropositionViewer({
  html,
  prospectId,
  prenom,
  nom,
  propositionId,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [sendingContact, setSendingContact] = useState(false);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');

  // Track la visite côté serveur (une seule fois)
  useEffect(() => {
    void fetch(`/api/prospects/${prospectId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ proposition_vue_at: new Date().toISOString() }),
    }).catch(() => undefined);
  }, [prospectId]);

  async function handleDownloadPdf() {
    if (!contentRef.current) return;
    setDownloadingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
      const margin = 36;
      const pageWidth = doc.internal.pageSize.getWidth();
      const usableWidth = pageWidth - margin * 2;
      const text = contentRef.current.innerText;
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(text, usableWidth);
      doc.setFont('helvetica');
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = margin;
      lines.forEach((line: string) => {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 14;
      });
      doc.save(`proposition-${propositionId}.pdf`);
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleContact(e: React.FormEvent) {
    e.preventDefault();
    setSendingContact(true);
    try {
      await fetch(`/api/prospects/${prospectId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          telephone: phone || undefined,
          notes: `Demande étude technique via proposition (${new Date().toLocaleString('fr-FR')}) — ${message}`,
          statut: 'visite_planifiee',
        }),
      });
      setContactSent(true);
    } finally {
      setSendingContact(false);
    }
  }

  return (
    <div style={{ background: '#F8F9FC', minHeight: '100vh' }}>
      {/* Barre d'actions sticky */}
      <div
        className="sticky top-0 z-10 backdrop-blur"
        style={{
          background: 'rgba(255,255,255,0.92)',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F5821F, #D96B0A)' }}
            >
              <Sun className="w-4 h-4 text-white" />
            </div>
            <div className="font-display font-bold leading-tight">
              <span style={{ color: '#F5821F' }}>Énergies</span> Concept
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleDownloadPdf} loading={downloadingPdf} variant="ghost">
              {!downloadingPdf && <Download className="w-4 h-4" />} Télécharger PDF
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                document
                  .getElementById('contact-form')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              <Send className="w-4 h-4" /> Demander une visite
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu HTML proposition */}
      <div
        ref={contentRef}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Formulaire contact en bas */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="card" id="contact-form">
          <h2 className="font-display text-2xl font-bold mb-1">
            Demander une étude technique
          </h2>
          <p className="text-text-muted mb-4">
            Bonjour {prenom} {nom}, un de nos experts vous recontacte sous 24h
            pour confirmer l'étude sur place.
          </p>

          {contactSent ? (
            <div
              className="rounded-card p-4 flex items-start gap-3"
              style={{ background: '#D1FAE5', color: '#065F46' }}
            >
              <Check className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Demande envoyée</div>
                <div className="text-sm mt-1">
                  Merci ! Nous vous contactons dans les meilleurs délais.
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleContact} className="space-y-3">
              <div>
                <label className="text-xs uppercase font-semibold text-text-muted">
                  Téléphone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input mt-1"
                  placeholder="06 12 34 56 78"
                />
              </div>
              <div>
                <label className="text-xs uppercase font-semibold text-text-muted">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input mt-1"
                  rows={3}
                  placeholder="Vos disponibilités, questions, contraintes…"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={sendingContact}>
                  <Send className="w-4 h-4" /> Envoyer la demande
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
