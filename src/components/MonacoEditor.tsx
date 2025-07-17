import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, FileCode } from 'lucide-react';
import { toast } from "sonner";

interface GeneratedCode {
  html: string;
  css: string;
  js: string;
  framework: 'react' | 'html' | 'vue';
}

interface MonacoEditorProps {
  code: GeneratedCode;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ code }) => {
  const [activeFile, setActiveFile] = useState<'html' | 'css' | 'js'>('html');

  const copyToClipboard = async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(`${type} copied to clipboard!`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded!`);
  };

  const getLanguage = (fileType: string) => {
    switch (fileType) {
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'js':
        return 'javascript';
      default:
        return 'javascript';
    }
  };

  const getFileExtension = (fileType: string) => {
    switch (fileType) {
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'js':
        return 'js';
      default:
        return 'js';
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Code Editor</span>
          <Badge variant="outline" className="text-xs">
            {code.framework}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(code[activeFile], activeFile.toUpperCase())}
            className="h-7 px-2"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => downloadFile(code[activeFile], `index.${getFileExtension(activeFile)}`)}
            className="h-7 px-2"
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* File Tabs and Editor */}
      <Tabs value={activeFile} onValueChange={(value) => setActiveFile(value as 'html' | 'css' | 'js')} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 h-10 bg-muted/50 rounded-none border-b border-border">
          <TabsTrigger value="html" className="text-xs">
            index.html
          </TabsTrigger>
          <TabsTrigger value="css" className="text-xs">
            styles.css
          </TabsTrigger>
          <TabsTrigger value="js" className="text-xs">
            script.js
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 relative">
          <TabsContent value="html" className="h-full m-0">
            <Editor
              height="100%"
              language="html"
              value={code.html}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                fontSize: 13,
                lineNumbers: 'on',
                folding: true,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
              }}
            />
          </TabsContent>

          <TabsContent value="css" className="h-full m-0">
            <Editor
              height="100%"
              language="css"
              value={code.css}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                fontSize: 13,
                lineNumbers: 'on',
                folding: true,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
              }}
            />
          </TabsContent>

          <TabsContent value="js" className="h-full m-0">
            <Editor
              height="100%"
              language="javascript"
              value={code.js}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                fontSize: 13,
                lineNumbers: 'on',
                folding: true,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
              }}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};