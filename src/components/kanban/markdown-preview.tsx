'use client';
import React from 'react';

interface HtmlPreviewProps {
  htmlContent: string;
}

const HtmlPreview: React.FC<HtmlPreviewProps> = ({ htmlContent }) => {
  // Since the content is already sanitized before saving, we can render it.
  // It's crucial that sanitization ALWAYS happens before `setDoc` or `updateDoc`.
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: htmlContent || '' }}
    />
  );
};

export default HtmlPreview;
