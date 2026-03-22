import { useRef, useEffect } from 'preact/hooks';
import { initStage, resizeStage, destroyStage } from './stage-renderer';

export function ClawdStage() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    initStage(canvas);

    const handleResize = () => {
      resizeStage(canvas);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      destroyStage();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
