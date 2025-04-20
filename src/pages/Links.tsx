
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Links() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

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
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                  >
                    <Link to={`/${link.slug}`}>
                      Открыть
                    </Link>
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
