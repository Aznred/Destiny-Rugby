import { motion } from 'framer-motion';

interface JaugeProps {
  label: string;
  valeur: number;
  max?: number;
  variante?: 'vert' | 'or' | 'cuir';
}

export function Jauge({ label, valeur, max = 100, variante = 'vert' }: JaugeProps) {
  const pct = Math.max(0, Math.min(100, (valeur / max) * 100));
  return (
    <div className={`jauge ${variante}`}>
      <div className="tete">
        <b>{label}</b>
        <span>{Math.round(valeur)}{max === 100 ? '' : `/${max}`}</span>
      </div>
      <div className="piste">
        <motion.div
          className="rempli"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
    </div>
  );
}
