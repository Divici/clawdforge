import { useRef, useEffect } from 'preact/hooks';
import { initStage, resizeStage } from './stage-renderer';

export function ClawdStage() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    initStage(canvas);

    const handleResize = () => {
      resizeStage(canvas);
      // Re-init to redraw after resize
      initStage(canvas);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
