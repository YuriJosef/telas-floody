import React from 'react';
export default function InlineAlert({ children, onDismiss }) {
  return <div role="alert" className="inline-alert"><span>{children}</span><button onClick={onDismiss} aria-label="Fechar aviso">×</button></div>;
}
