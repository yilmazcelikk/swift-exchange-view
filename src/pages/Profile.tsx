import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockUser } from "@/data/mockData";
import { UserCircle, Plus } from "lucide-react";

const Profile = () => {
  const [user, setUser] = useState(mockUser);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  const bankAccounts = [
    { id: "1", bankName: "Ziraat Bankası", iban: "TR33 0001 0009 4537 1234 5678 90", accountHolder: "Ahmet Yılmaz" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold">Kişisel Bilgilerim</h1>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            Profil Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ad Soyad</label>
            <Input value={user.fullName} onChange={(e) => setUser({ ...user, fullName: e.target.value })} className="bg-muted/50" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">E-posta</label>
            <Input value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} className="bg-muted/50" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Telefon</label>
            <Input value={user.phone} onChange={(e) => setUser({ ...user, phone: e.target.value })} className="bg-muted/50" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Doğum Tarihi</label>
            <Input type="date" value={user.birthDate || ""} onChange={(e) => setUser({ ...user, birthDate: e.target.value })} className="bg-muted/50" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ülke</label>
            <Input value={user.country || ""} onChange={(e) => setUser({ ...user, country: e.target.value })} className="bg-muted/50" />
          </div>
          <div className="flex items-end">
            <Button className="w-full">Bilgileri Güncelle</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Şifre Değiştir</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Mevcut Şifre</label>
            <Input type="password" placeholder="••••••••" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className="bg-muted/50" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Yeni Şifre</label>
            <Input type="password" placeholder="••••••••" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className="bg-muted/50" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Yeni Şifre Tekrar</label>
            <Input type="password" placeholder="••••••••" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="bg-muted/50" />
          </div>
          <div className="md:col-span-3">
            <Button variant="outline">Şifre Değiştir</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Banka Hesaplarım</CardTitle>
          <Button size="sm" variant="outline" className="gap-1">
            <Plus className="h-4 w-4" /> Hesap Ekle
          </Button>
        </CardHeader>
        <CardContent>
          {bankAccounts.map((acc) => (
            <div key={acc.id} className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{acc.bankName}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">{acc.iban}</p>
                <p className="text-xs text-muted-foreground">{acc.accountHolder}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-sell">Sil</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
