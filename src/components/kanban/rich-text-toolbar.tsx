'use client';
import React from 'react';
import { Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>;
}

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ editorRef }) => {
  const applyFormatting = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
    }
  };

  const createLink = () => {
    const url = prompt('Enter the URL:');
    if (url) {
      applyFormatting('createLink', url);
    }
  };

  const handleCommand = (e: React.MouseEvent<HTMLButtonElement>, cmd: string) => {
    e.preventDefault(); // Prevent editor from losing focus
    if (cmd === 'createLink') {
      createLink();
    } else {
      applyFormatting(cmd);
    }
  };

  const buttons = [
    { cmd: 'bold', icon: Bold, title: 'Bold' },
    { cmd: 'italic', icon: Italic, title: 'Italic' },
    { cmd: 'underline', icon: Underline, title: 'Underline' },
    { cmd: 'createLink', icon: LinkIcon, title: 'Insert Link' },
    { cmd: 'insertUnorderedList', icon: List, title: 'Bulleted List' },
    { cmd: 'insertOrderedList', icon: ListOrdered, title: 'Numbered List' },
  ];

  return (
    <div className="flex items-center gap-1 rounded-md border bg-transparent p-1">
      {buttons.map((btn) => (
        <Button
          key={btn.cmd}
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={(e) => handleCommand(e, btn.cmd)}
          title={btn.title}
          className="h-8 w-8"
        >
          <btn.icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
};

export default RichTextToolbar;
