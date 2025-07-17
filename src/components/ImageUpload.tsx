import React, { useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  FileImage,
  Sparkles,
  Eye
} from 'lucide-react';
import { toast } from "sonner";

interface ImageUploadProps {
  onImageUpload: (imageUrl: string | null) => void;
  uploadedImage: string | null;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload, uploadedImage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('Image size should be less than 10MB');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Convert to base64 for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageUpload(e.target.result as string);
          toast.success('Image uploaded successfully!');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to process image');
      console.error('Image processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [onImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const removeImage = () => {
    onImageUpload(null);
    toast.success('Image removed');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Upload design mockup or UI screenshot
        </label>
        <p className="text-xs text-muted-foreground mb-4">
          Upload an image of your design and AI will generate the code for it
        </p>
      </div>

      {uploadedImage ? (
        <Card className="relative group">
          <CardContent className="p-4">
            <div className="relative">
              <img
                src={uploadedImage}
                alt="Uploaded design"
                className="w-full h-48 object-contain rounded-lg bg-muted/20"
              />
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(uploadedImage, '_blank')}
                  className="backdrop-blur-sm"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={removeImage}
                  className="backdrop-blur-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
            
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileImage className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Image uploaded</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Ready for AI
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={`relative transition-all duration-200 cursor-pointer ${
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-dashed border-2 hover:border-primary/50 hover:bg-muted/20'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
        >
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-colors ${
                isDragging 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent" />
                ) : (
                  <Upload className="h-8 w-8" />
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {isDragging ? 'Drop your image here' : 'Upload Design Image'}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Drag and drop your design mockup, or click to browse
                </p>
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                  id="image-upload"
                  disabled={isProcessing}
                />
                
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={isProcessing}
                  className="relative"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Choose Image'}
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Supported: PNG, JPG, GIF, WebP</p>
                <p>Max size: 10MB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Processing Info */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium">AI Vision Analysis</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our AI will analyze your image to understand the layout, components, 
                colors, and typography, then generate responsive HTML, CSS, and JavaScript code.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};