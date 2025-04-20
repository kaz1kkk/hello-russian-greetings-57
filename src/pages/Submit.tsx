
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export default function Submit() {
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [upc, setUpc] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const validateSpotifyUrl = (url: string) => {
    return url.includes('spotify.com/') && (url.includes('/track/') || url.includes('/album/'));
  };

  const validateUPC = (code: string) => {
    return /^\d{12,13}$/.test(code);
  };

  const handleSubmit = async (e: React.FormEvent, type: 'url' | 'upc') => {
    e.preventDefault();
    setErrorMessage("");
    
    if (type === 'url' && !validateSpotifyUrl(spotifyUrl)) {
      setErrorMessage("Пожалуйста, введите корректную ссылку на трек или альбом Spotify");
      toast.error("Неверный формат ссылки Spotify");
      return;
    }

    if (type === 'upc' && !validateUPC(upc)) {
      setErrorMessage("Пожалуйста, введите корректный UPC/EAN код (12-13 цифр)");
      toast.error("Неверный формат UPC/EAN");
      return;
    }
    
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-release', {
        body: type === 'url' ? { spotifyUrl } : { upc }
      });

      if (error) throw new Error(error.message);
      if (!data || !data.slug) throw new Error("Не удалось создать релиз");
      
      toast.success("Релиз успешно создан!");
      navigate(`/${data.slug}`);
    } catch (error: any) {
      console.error('Error:', error);
      setErrorMessage(error.message || "Ошибка при создании релиза");
      toast.error(error.message || "Ошибка при создании релиза");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-zinc-800 p-4">
      <div className="w-full max-w-md space-y-6 backdrop-blur-lg bg-white/5 p-8 rounded-2xl border border-white/10">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-medium text-white">Создать мульти-линк</h1>
          <p className="text-zinc-400">Используйте Spotify ссылку или UPC/EAN код</p>
        </div>
        
        <Tabs defaultValue="url" className="space-y-6">
          <TabsList className="w-full">
            <TabsTrigger value="url" className="flex-1">Spotify URL</TabsTrigger>
            <TabsTrigger value="upc" className="flex-1">UPC/EAN</TabsTrigger>
          </TabsList>

          <TabsContent value="url">
            <form onSubmit={(e) => handleSubmit(e, 'url')} className="space-y-6">
              <div className="space-y-2">
                <Input
                  type="text"
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  placeholder="https://open.spotify.com/track/..."
                  className="w-full bg-white/10 border-white/10 text-white placeholder:text-zinc-500"
                />
                <p className="text-xs text-zinc-500">
                  Пример: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-white/10 hover:bg-white/20 text-white py-6"
                disabled={isLoading}
              >
                {isLoading ? "Создаем..." : "Создать мульти-линк"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="upc">
            <form onSubmit={(e) => handleSubmit(e, 'upc')} className="space-y-6">
              <div className="space-y-2">
                <Input
                  type="text"
                  value={upc}
                  onChange={(e) => setUpc(e.target.value)}
                  placeholder="Введите UPC/EAN код"
                  className="w-full bg-white/10 border-white/10 text-white placeholder:text-zinc-500"
                />
                <p className="text-xs text-zinc-500">
                  Пример: 0888880123456
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-white/10 hover:bg-white/20 text-white py-6"
                disabled={isLoading}
              >
                {isLoading ? "Создаем..." : "Создать мульти-линк"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {errorMessage && (
          <p className="text-sm text-red-400 text-center">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
