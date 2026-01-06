import { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import { useLoading } from '../../context/LoadingContext.jsx';
import './GlobalLoader.scss';
import loadingLottie from '../../assets/lotties/loading-lottie.json';

const GlobalLoader = ({ size = 100, className = "", isLoading: isLoadingProp }) => {
    const { isLoading: isLoadingContext } = useLoading();
    const isLoading = isLoadingProp ?? isLoadingContext;
    const [shouldRender, setShouldRender] = useState(false);
    const container = useRef(null);
    const anim = useRef(null);
    const lastStart = useRef(0);

    useEffect(() => {
        if (isLoading) {
            setShouldRender(true);
            lastStart.current = Date.now();
        } else {
            const elapsed = Date.now() - lastStart.current;
            const remaining = Math.max(0, 800 - elapsed);

            const timer = setTimeout(() => {
                setShouldRender(false);
            }, remaining);

            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    useEffect(() => {
        if (shouldRender && container.current) {
            anim.current = lottie.loadAnimation({
                container: container.current,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: loadingLottie,
            });

            return () => {
                if (anim.current) {
                    anim.current.destroy();
                    anim.current = null;
                }
            };
        }
    }, [shouldRender]);

    if (!shouldRender) return null;

    return (
        <div className={`global-loader-overlay ${className}`}>
            <div className="loader-content">
                <div
                    ref={container}
                    className="lottie-container"
                    style={{ width: size, height: size }}
                />
                <p className="loader-text">Cargando...</p>
            </div>
        </div>
    );
};

export default GlobalLoader;
