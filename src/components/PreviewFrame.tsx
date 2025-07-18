import React, { useEffect, useRef, useState } from 'react';
import { WebContainer } from '@webcontainer/api';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface PreviewFrameProps {
  html: string;
  css: string;
  js: string;
}

export function PreviewFrame({ html, css, js }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [webcontainerInstance, setWebcontainerInstance] = useState<WebContainer | null>(null);
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [useWebContainer, setUseWebContainer] = useState(true);

  useEffect(() => {
    if (useWebContainer) {
      initWebContainer();
    }
  }, [useWebContainer]);

  useEffect(() => {
    if (html) {
      if (webcontainerInstance && useWebContainer) {
        updateWebContainerPreview();
      } else {
        // Use fallback iframe with srcdoc
        updateFallbackPreview();
      }
    }
  }, [html, css, js, webcontainerInstance]);

  const initWebContainer = async () => {
    try {
      setIsLoading(true);
      console.log('Initializing WebContainer...');
      
      const webcontainer = await WebContainer.boot();
      setWebcontainerInstance(webcontainer);
      
      console.log('WebContainer initialized successfully');
      toast.success('WebContainer initialized');
      
    } catch (error) {
      console.error('Failed to initialize WebContainer:', error);
      toast.error('WebContainer failed, using fallback preview');
      setUseWebContainer(false);
    } finally {
      setIsLoading(false);
    }
  };

  const updateWebContainerPreview = async () => {
    if (!webcontainerInstance || !html) return;

    try {
      setIsLoading(true);
      console.log('Updating WebContainer preview...');

      // Create index.html with embedded CSS and JS
      const fullHTML = createFullHTML(html, css, js);

      // Create the file structure
      const files = {
        'index.html': {
          file: {
            contents: fullHTML,
          },
        },
        'package.json': {
          file: {
            contents: JSON.stringify({
              name: 'generated-app',
              version: '1.0.0',
              scripts: {
                start: 'npx http-server -p 3000 -c-1 --cors',
              },
              devDependencies: {
                'http-server': '^14.1.1'
              }
            }),
          },
        },
      };

      // Mount the files
      await webcontainerInstance.mount(files);

      // Install dependencies
      console.log('Installing dependencies...');
      const installProcess = await webcontainerInstance.spawn('npm', ['install']);
      const installExitCode = await installProcess.exit;
      
      if (installExitCode !== 0) {
        throw new Error('Failed to install dependencies');
      }

      // Start the development server
      console.log('Starting development server...');
      webcontainerInstance.spawn('npm', ['start']);

      // Listen for server ready event
      webcontainerInstance.on('server-ready', (port, url) => {
        console.log(`Server ready at ${url}`);
        setUrl(url);
        setIsLoading(false);
        toast.success('Preview ready!');
      });

    } catch (error) {
      console.error('Failed to update WebContainer preview:', error);
      toast.error('WebContainer preview failed, using fallback');
      setUseWebContainer(false);
      updateFallbackPreview();
    }
  };

  const updateFallbackPreview = () => {
    setIsLoading(false);
    // The iframe will update automatically with srcdoc
  };

  const createFullHTML = (htmlContent: string, cssContent: string, jsContent: string) => {
    // If HTML already contains DOCTYPE and html tags, use as is with embedded CSS/JS
    if (htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html')) {
      // Inject CSS and JS into the existing HTML structure
      let modifiedHTML = htmlContent;
      
      if (cssContent && !htmlContent.includes('<style>')) {
        const styleTag = `<style>${cssContent}</style>`;
        if (htmlContent.includes('</head>')) {
          modifiedHTML = modifiedHTML.replace('</head>', `${styleTag}\n</head>`);
        } else {
          modifiedHTML = `${styleTag}\n${modifiedHTML}`;
        }
      }
      
      if (jsContent && !htmlContent.includes('<script>')) {
        const scriptTag = `<script>${jsContent}</script>`;
        if (htmlContent.includes('</body>')) {
          modifiedHTML = modifiedHTML.replace('</body>', `${scriptTag}\n</body>`);
        } else {
          modifiedHTML = `${modifiedHTML}\n${scriptTag}`;
        }
      }
      
      return modifiedHTML;
    }

    // Create a complete HTML document
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated App</title>
  <style>
    ${cssContent || ''}
  </style>
</head>
<body>
  ${htmlContent}
  <script>
    ${jsContent || ''}
  </script>
</body>
</html>`;
  };

  const refreshPreview = () => {
    if (useWebContainer && webcontainerInstance) {
      updateWebContainerPreview();
    } else if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const openInNewTab = () => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Generate combined HTML for fallback iframe
  const combinedHTML = createFullHTML(html, css, js);

  return (
    <div className="h-full border rounded-md overflow-hidden bg-white relative">
      <div className="flex items-center justify-between p-2 border-b bg-muted">
        <span className="text-sm font-medium">
          {useWebContainer ? 'WebContainer Preview' : 'Preview (Fallback)'}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={refreshPreview} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {url && (
            <Button variant="ghost" size="sm" onClick={openInNewTab}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {useWebContainer && url ? (
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-[calc(100%-3rem)]"
          title="Generated App Preview"
        />
      ) : (
        <iframe
          ref={iframeRef}
          srcDoc={combinedHTML}
          className="w-full h-[calc(100%-3rem)]"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          title="Generated App Preview"
        />
      )}
      
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {useWebContainer ? 'Setting up WebContainer...' : 'Loading preview...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}