const Blocked = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center space-y-3">
        <h1 className="text-6xl font-bold text-muted-foreground/40">503</h1>
        <p className="text-lg font-medium text-foreground">Hizmet Geçici Olarak Kullanılamıyor</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Sunucularımızda bakım çalışması yapılmaktadır. Lütfen daha sonra tekrar deneyin.
        </p>
      </div>
    </div>
  );
};

export default Blocked;
