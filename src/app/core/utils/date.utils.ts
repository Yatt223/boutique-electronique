/** Date et heure locales au format "2026-10-10T14:30:00" (sans fuseau, comme dans db.json). */
export function maintenantLocal(): string {
  const d = new Date();
  const deuxChiffres = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}` +
    `T${deuxChiffres(d.getHours())}:${deuxChiffres(d.getMinutes())}:${deuxChiffres(d.getSeconds())}`
  );
}
