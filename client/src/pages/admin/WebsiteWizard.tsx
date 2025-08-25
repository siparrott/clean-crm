import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
// Custom Progress component - inline for simplicity
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
    <div 
      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
      style={{ width: `${value}%` }}
    />
  </div>
);
import { 
  Globe, 
  Search, 
  Palette, 
  Image, 
  FileText, 
  BarChart3, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  ExternalLink 
} from "lucide-react";

interface WebsiteProfile {
  title?: string;
  description?: string;
  keywords?: string[];
  colors?: string[];
  images?: string[];
  main_text?: string;
}

interface AnalysisResult {
  status: string;
  profile?: WebsiteProfile;
  url?: string;
  message?: string;
  error?: string;
}

export default function WebsiteWizard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleAnalyze = async () => {
    if (!url) return;
    
    setLoading(true);
    setProgress(0);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch("/api/website-wizard/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url
        })
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();
      
      if (data.error) {
        setResult({
          status: "error",
          error: data.error,
          message: data.message || "Analysis failed"
        });
      } else if (data.status === "success") {
        setResult({
          status: "success",
          url: data.url,
          timestamp: data.timestamp,
          lighthouse: data.lighthouse,
          content: data.content,
          profile: data.profile,
          message: "Website analyzed successfully"
        });
      } else {
        setResult({
          status: "error",
          error: "Unknown response format",
          message: "Please try again"
        });
      }
    } catch (error) {
      setResult({
        status: "error",
        error: "Network error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderColorPalette = (colors?: string[]) => {
    if (!colors || colors.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2">
        {colors.slice(0, 8).map((color, index) => (
          <div
            key={index}
            className="w-8 h-8 rounded border-2 border-gray-300 flex items-center justify-center text-xs font-mono"
            style={{ backgroundColor: color }}
            title={color}
          >
            {color.length <= 4 && <span className="text-white mix-blend-difference">{color}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Website Wizard</h1>
        <p className="text-gray-600">
          Analyze any website to extract content, images, and SEO data for optimized photography website creation
        </p>
      </div>

      <Tabs defaultValue="analyze" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analyze" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Website URL
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Data Analysis
          </TabsTrigger>
          <TabsTrigger value="template" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Template Selection
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Content Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Enter Your Current Website URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Website URL</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-photography-website.com"
                  type="url"
                />
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">What we'll analyze:</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Content and copy for SEO optimization</li>
                  <li>• Portfolio images and galleries</li>
                  <li>• Contact information and services</li>
                  <li>• Current SEO performance</li>
                  <li>• Brand colors and styling</li>
                </ul>
              </div>

              {loading && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-center text-gray-600">
                    Analyzing website... {progress}%
                  </p>
                </div>
              )}

              <Button 
                onClick={handleAnalyze}
                disabled={!url || loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyze Website
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Analyze Website
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.status === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  Analysis Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.status === "success" ? (
                  <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-800 dark:text-green-200">{result.message}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-red-800 dark:text-red-200">{result.error}: {result.message}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {result?.profile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Content Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Page Title</label>
                    <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      {result.profile.title || "No title found"}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      {result.profile.description || "No description found"}
                    </p>
                  </div>

                  {result.profile.keywords && result.profile.keywords.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">Keywords</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.profile.keywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary">{keyword}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Brand Colors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderColorPalette(result.profile.colors)}
                  {(!result.profile.colors || result.profile.colors.length === 0) && (
                    <p className="text-sm text-gray-500">No brand colors detected</p>
                  )}
                </CardContent>
              </Card>

              {result.profile.images && result.profile.images.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="w-5 h-5" />
                      Images Found ({result.profile.images.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {result.profile.images.slice(0, 8).map((img, index) => (
                        <div key={index} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                          <Image className="w-8 h-8 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Analyze a website first to see the data analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="template" className="space-y-6">
          <Card>
            <CardContent className="text-center py-12">
              <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Template selection will be available after analysis</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardContent className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Content optimization will be available after analysis</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}