import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, Clock, ShieldCheck } from "lucide-react";

const steps = [
  { id: 1, label: "Ön Yüz", description: "Kimlik belgenizin ön yüzünü yükleyin" },
  { id: 2, label: "Arka Yüz", description: "Kimlik belgenizin arka yüzünü yükleyin" },
  { id: 3, label: "Tamamlandı", description: "Doğrulama talebiniz alındı" },
];

const Verification = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Kimlik Doğrulama
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Hesabınızı doğrulamak için kimlik belgenizi yükleyin.</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${
              currentStep > step.id ? "bg-buy text-buy-foreground" :
              currentStep === step.id ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            }`}>
              {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
            </div>
            <span className="text-sm font-medium hidden sm:block">{step.label}</span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Kimlik Ön Yüz</h3>
              <p className="text-sm text-muted-foreground">TC Kimlik Kartınızın veya Pasaportunuzun ön yüzünün fotoğrafını yükleyin.</p>
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">{frontFile ? frontFile.name : "Dosya seçin veya sürükleyin"}</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => setFrontFile(e.target.files?.[0] || null)} />
              </label>
              <Button onClick={handleNext} disabled={!frontFile} className="w-full">Devam Et</Button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Kimlik Arka Yüz</h3>
              <p className="text-sm text-muted-foreground">TC Kimlik Kartınızın arka yüzünün fotoğrafını yükleyin.</p>
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">{backFile ? backFile.name : "Dosya seçin veya sürükleyin"}</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => setBackFile(e.target.files?.[0] || null)} />
              </label>
              <Button onClick={handleNext} disabled={!backFile} className="w-full">Gönder</Button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-buy/10">
                <CheckCircle className="h-8 w-8 text-buy" />
              </div>
              <h3 className="text-lg font-bold">Belgeleriniz Alındı!</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">Kimlik doğrulama süreciniz başlatıldı. İnceleme 24-48 saat içinde tamamlanacaktır.</p>
              <div className="flex items-center justify-center gap-2 text-warning">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">İnceleme Bekleniyor</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Verification;
