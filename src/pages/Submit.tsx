import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function Submit() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    yandex: false,
    soundcloud: false
  });

  const validateInput = (value: string) => {
    if (value.includes('spotify.com/')) {
      return value.includes('/track/') || value.includes('/album/');
    }
    return /^\d{12,13}$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    
    if (!validateInput(input)) {
      setErrorMessage("Пожалуйста, введите корректную ссылку Spotify или UPC/EAN код (12-13 цифр)");
      toast.error("Неверный формат ввода");
      return;
    }
    
    setIsLoading(true);

    try {
      const isSpotifyUrl = input.includes('spotify.com/');
      
      const requestBody = {
        ...(isSpotifyUrl ? { spotifyUrl: input } : { upc: input }),
        platforms: {
          spotify: true, // Always included
          appleMusic: true, // Always included
          youtubeMusic: true, // Always included
          yandex: selectedPlatforms.yandex,
          soundcloud: selectedPlatforms.soundcloud
        }
      };
      
      const { data, error } = await supabase.functions.invoke('generate-release', {
        body: requestBody
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Вы успешно вышли из аккаунта');
    } catch (error: any) {
      toast.error('Ошибка при выходе из аккаунта');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 glass p-8 rounded-xl">
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            Выйти
          </Button>
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-medium text-gradient">Создать мульти-линк</h1>
          <p className="text-muted-foreground">Используйте Spotify ссылку или UPC/EAN код</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Spotify URL или UPC/EAN код"
              className="w-full bg-secondary/50 border-secondary text-foreground placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Примеры: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT или 0888880123456
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Д��полнительные платформы:</p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="yandex"
                  checked={selectedPlatforms.yandex}
                  onCheckedChange={(checked) => 
                    setSelectedPlatforms(prev => ({ ...prev, yandex: checked as boolean }))
                  }
                />
                <Label htmlFor="yandex" className="text-foreground">Яндекс Музыка</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="soundcloud"
                  checked={selectedPlatforms.soundcloud}
                  onCheckedChange={(checked) => 
                    setSelectedPlatforms(prev => ({ ...prev, soundcloud: checked as boolean }))
                  }
                />
                <Label htmlFor="soundcloud" className="text-foreground">SoundCloud</Label>
              </div>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
            disabled={isLoading}
          >
            {isLoading ? "Создаем..." : "Создать мульти-линк"}
          </Button>
          
          {errorMessage && (
            <p className="text-sm text-destructive text-center">{errorMessage}</p>
          )}
        </form>
      </div>
    </div>
  );
}
