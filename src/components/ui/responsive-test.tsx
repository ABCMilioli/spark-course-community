import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ResponsiveTest() {
  const isMobile = useIsMobile();

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Teste de Responsividade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={isMobile ? "destructive" : "default"}>
              {isMobile ? "Mobile" : "Desktop"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Largura da tela: {window.innerWidth}px
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="bg-primary/10 p-4 rounded-lg text-center">
              <div className="text-sm font-medium">Mobile</div>
              <div className="text-xs text-muted-foreground">&lt; 768px</div>
            </div>
            <div className="bg-secondary/10 p-4 rounded-lg text-center">
              <div className="text-sm font-medium">Tablet</div>
              <div className="text-xs text-muted-foreground">768px - 1024px</div>
            </div>
            <div className="bg-accent/10 p-4 rounded-lg text-center">
              <div className="text-sm font-medium">Desktop</div>
              <div className="text-xs text-muted-foreground">1024px - 1280px</div>
            </div>
            <div className="bg-muted p-4 rounded-lg text-center">
              <div className="text-sm font-medium">Large</div>
              <div className="text-xs text-muted-foreground">&gt; 1280px</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Breakpoints Utilizados:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <code>sm:</code> 640px+ (tablets pequenos)</li>
              <li>• <code>md:</code> 768px+ (tablets)</li>
              <li>• <code>lg:</code> 1024px+ (desktop pequeno)</li>
              <li>• <code>xl:</code> 1280px+ (desktop grande)</li>
              <li>• <code>2xl:</code> 1536px+ (desktop extra grande)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 