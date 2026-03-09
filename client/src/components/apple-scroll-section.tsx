import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function AppleScrollSection() {
    const containerRef = useRef<HTMLDivElement>(null);

    // Track scroll position within the 400vh container
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // --- Animations based on scroll progress (0 to 1) ---

    // Main Background/Device Scaling
    // Scale down from 1.5 to 0.8 as user scrolls from 0 to 40%
    const imageScale = useTransform(scrollYProgress, [0, 0.4], [1.2, 0.8]);
    // Opacity decreases heavily after 60%
    const imageOpacity = useTransform(scrollYProgress, [0, 0.4, 0.6, 0.8], [1, 1, 0.3, 0]);
    const imageFilter = useTransform(scrollYProgress, [0, 0.4], ["blur(0px)", "blur(10px)"]);

    // Text 1: Appears 10% -> 25%, disappears 30% -> 40%
    const text1Opacity = useTransform(scrollYProgress, [0.05, 0.15, 0.25, 0.35], [0, 1, 1, 0]);
    const text1Y = useTransform(scrollYProgress, [0.05, 0.15, 0.25, 0.35], [50, 0, 0, -50]);

    // Text 2: Appears 35% -> 50%, disappears 55% -> 65%
    const text2Opacity = useTransform(scrollYProgress, [0.35, 0.45, 0.55, 0.65], [0, 1, 1, 0]);
    const text2Y = useTransform(scrollYProgress, [0.35, 0.45, 0.55, 0.65], [50, 0, 0, -50]);

    // Text 3: Appears 65% -> 80%, stays until 100%
    const text3Opacity = useTransform(scrollYProgress, [0.65, 0.8, 1], [0, 1, 1]);
    const text3Scale = useTransform(scrollYProgress, [0.65, 0.8, 1], [0.8, 1, 1.1]);

    return (
        <section ref={containerRef} className="relative h-[400vh] bg-black text-white w-full">
            {/* Sticky container that locks securely while we scroll through the 400vh */}
            <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col items-center justify-center">

                {/* Main Visual Element (e.g. "Device" or "Hero background") */}
                <motion.div
                    style={{ scale: imageScale, opacity: imageOpacity, filter: imageFilter }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                    <div className="w-[90vw] md:w-[70vw] h-[80vh] rounded-[2rem] md:rounded-[4rem] overflow-hidden shadow-2xl shadow-primary/20 bg-gradient-to-br from-zinc-900 to-black border border-white/10 flex items-center justify-center relative">
                        {/* Visual content inside the mock device/frame */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_60%)]"></div>
                        <div className="text-center space-y-4 z-10 p-8">
                            <h2 className="text-6xl md:text-8xl lg:text-[10rem] font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
                                ENGGBOT
                            </h2>
                            <p className="text-2xl md:text-4xl font-medium tracking-tight text-white/50">
                                Next generation learning.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Text Overlay 1 */}
                <motion.div
                    style={{ opacity: text1Opacity, y: text1Y }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none px-6 z-20"
                >
                    <h2 className="text-4xl md:text-7xl font-semibold max-w-5xl text-center text-balance leading-tight tracking-tight drop-shadow-2xl">
                        Profoundly intelligent. <br />
                        <span className="text-white/40">Tuned specifically for your university curriculum.</span>
                    </h2>
                </motion.div>

                {/* Text Overlay 2 */}
                <motion.div
                    style={{ opacity: text2Opacity, y: text2Y }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none px-6 z-20"
                >
                    <h2 className="text-4xl md:text-7xl font-semibold max-w-5xl text-center text-balance leading-tight tracking-tight drop-shadow-2xl">
                        Infinite context. <br />
                        <span className="text-white/40">Professors' notes, slides, and textbooks in milliseconds.</span>
                    </h2>
                </motion.div>

                {/* Text Overlay 3 - Grand Finale */}
                <motion.div
                    style={{ opacity: text3Opacity, scale: text3Scale }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none px-6 z-20"
                >
                    <div className="text-center space-y-8">
                        <h2 className="text-6xl md:text-8xl lg:text-9xl font-bold max-w-5xl text-center text-balance leading-none tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                            A new era of study.
                        </h2>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
