
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { RefreshCcw, Trash2 } from "lucide-react";

export default function Links() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescanningId, setRescanningId] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error: any) {
      console.error('Error fetching links:', error);
      toast.error("Не удалось загрузить ссылки");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('releases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLinks(links.filter((link: any) => link.id !== id));
      toast.success("Ссылка удалена");
    } catch (error: any) {
      console.error('Error deleting link:', error);
      toast.error("Не удалось удалить ссылку");
    }
  };

  const handleRescan = async (id: string) => {
    try {
      setRescanningId(id);
      const link = links.find((l: any) => l.id === id);
      
      if (!link) throw new Error("Ссылка не найдена");

      const { error } = await supabase.functions.invoke('generate-release', {
        body: { 
          spotifyUrl: link.spotify_url,
          platforms: {
            spotify: true,
            appleMusic: true,
            youtubeMusic: true
          }
        }
      });

      if (error) throw error;
      
      toast.success("Ссылка обновлена");
      await fetchLinks();
    } catch (error: any) {
      console.error('Error rescanning link:', error);
      toast.error("Не удалось обновить ссылку");
    } finally {
      setRescanningId(null);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-medium mb-2">Все ссылки</h1>
        <p className="text-muted-foreground">Список всех созданных вами мульти-ссылок</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <p>Загрузка...</p>
        </div>
      ) : links.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Слаг</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Дата создания</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link: any) => (
              <TableRow key={link.id}>
                <TableCell className="font-medium">{link.slug}</TableCell>
                <TableCell>{link.title || "Без названия"}</TableCell>
                <TableCell>
                  {new Date(link.created_at).toLocaleDateString("ru-RU")}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                  >
                    <Link to={`/${link.slug}`}>
                      Открыть
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRescan(link.id)}
                    disabled={rescanningId === link.id}
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(link.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center p-8 bg-muted/50 rounded-lg">
          <p className="mb-4">У вас пока нет созданных ссылок</p>
          <Button asChild>
            <Link to="/submit">Создать первую ссылку</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
