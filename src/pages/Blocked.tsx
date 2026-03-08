import { Ban } from "lucide-react";

const Blocked = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <Ban className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Erişim Engellendi</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Bu hesap kalıcı olarak engellenmiştir. Siteye erişiminiz kısıtlanmıştır.
          </p>
        </div>
        <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
          <p className="text-xs text-muted-foreground">
            Bunun bir hata olduğunu düşünüyorsanız lütfen destek ekibimizle iletişime geçin.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Blocked;
