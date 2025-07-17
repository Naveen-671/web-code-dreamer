import React, { forwardRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  ExternalLink,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface PreviewFrameProps {
  isReady: boolean;
}

export const PreviewFrame = forwardRef<HTMLIFrameElement, PreviewFrameProps>(
  ({ isReady }, ref) => {
    const [device, setDevice] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const getDeviceStyles = () => {
      switch (device) {
        case 'mobile':
          return 'w-[375px] h-[667px]';
        case 'tablet':
          return 'w-[768px] h-[1024px]';
        default:
          return 'w-full h-full';
      }
    };

    const handleRefresh = () => {
      if (ref && 'current' in ref && ref.current) {
        setIsRefreshing(true);
        ref.current.src = ref.current.src;
        setTimeout(() => setIsRefreshing(false), 1000);
      }
    };

    const openInNewTab = () => {
      if (ref && 'current' in ref && ref.current && ref.current.src) {
        window.open(ref.current.src, '_blank');
      }
    };

    return (
      <div className="h-full flex flex-col bg-muted/20">
        {/* Preview Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Live Preview</span>
            {isReady && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                Live
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Device Selector */}
            <div className="flex items-center bg-muted rounded-md p-1">
              <Button
                variant={device === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevice('desktop')}
                className="h-7 px-2"
              >
                <Monitor className="h-3 w-3" />
              </Button>
              <Button
                variant={device === 'tablet' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevice('tablet')}
                className="h-7 px-2"
              >
                <Tablet className="h-3 w-3" />
              </Button>
              <Button
                variant={device === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevice('mobile')}
                className="h-7 px-2"
              >
                <Smartphone className="h-3 w-3" />
              </Button>
            </div>

            {/* Controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={!isReady || isRefreshing}
              className="h-7 px-2"
            >
              {isRefreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={openInNewTab}
              disabled={!isReady}
              className="h-7 px-2"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          {!isReady ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto">
                <Monitor className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Preview Loading</h3>
                <p className="text-muted-foreground text-sm">
                  Setting up the preview environment...
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          ) : (
            <Card className={`bg-white shadow-xl overflow-hidden transition-all duration-300 ${getDeviceStyles()}`}>
              <iframe
                ref={ref}
                className="w-full h-full border-0"
                title="Generated Code Preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </Card>
          )}
        </div>

        {/* Preview Footer */}
        {isReady && (
          <div className="p-3 border-t border-border bg-background/50 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Device: {device}</span>
                <span>
                  Resolution: {
                    device === 'mobile' ? '375x667' :
                    device === 'tablet' ? '768x1024' :
                    'Responsive'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Preview Active</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);