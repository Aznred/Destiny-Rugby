import { useEffect, useState } from 'react';

export function useNomPorteur(id: string | null | undefined) {
  const [visible, setVisible] = useState(id);
  useEffect(() => {
    setVisible(id);
    const fin = window.setTimeout(() => setVisible(null), 2500);
    return () => window.clearTimeout(fin);
  }, [id]);
  return !!id && visible === id;
}
