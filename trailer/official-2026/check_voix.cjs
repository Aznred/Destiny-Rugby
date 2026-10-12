const { execSync } = require('child_process');
for (let i = 0; i < 12; i++) {
  const pFR = `trailer/official-2026/voix-fr/fr_${String(i).padStart(2,'0')}.wav`;
  const pEN = `trailer/official-2026/voix-en/en_${String(i).padStart(2,'0')}.wav`;
  const dFR = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${pFR}"`).toString().trim());
  const dEN = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${pEN}"`).toString().trim());
  console.log(`Clip ${i}: FR=${dFR.toFixed(2)}s, EN=${dEN.toFixed(2)}s`);
}
