-- =====================================================================
-- Optional: Dokumenten-Ordner (Bucket) absichern
--
-- Skript 23 legt den Ordner "athlete-documents" privat an - aber nur,
-- wenn es ihn noch nicht gab. Existierte er schon (z. B. von Hand als
-- "public" angelegt), bleibt er so. Dieses Skript setzt fuer GENAU
-- diesen Ordner: privat, max. 10 MB je Datei, nur PDF und Fotos.
--
-- Es aendert eine EINSTELLUNG des Ordners, keine Dateien und keine
-- Daten in Tabellen. Es ist bewusst ein eigenes Skript, damit du
-- entscheidest. Vorher sicherheitscheck.sql ansehen: Steht dort
-- "Datei-Ordner ist oeffentlich ... athlete-documents" oder der
-- Hinweis zu fehlenden Grenzen, dieses Skript ausfuehren.
-- =====================================================================

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
where id = 'athlete-documents';

-- Kontrolle
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'athlete-documents';
