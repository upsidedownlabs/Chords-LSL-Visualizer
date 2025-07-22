import React, {
    useEffect,
    useRef,
    useState,
    useCallback,
    useImperativeHandle,
    forwardRef,
} from "react";
import { useTheme } from "next-themes";
import { BitSelection } from "./page";
import { WebglPlot, ColorRGBA, WebglLine } from "webgl-plot";
import { lightThemeColors, darkThemeColors } from "./Colors";

interface CanvasProps {
    pauseRef: React.RefObject<boolean>;
    isConnected: boolean;
    selectedBits?: BitSelection;
    isDisplay: boolean;
    canvasCount?: number;
    selectedChannels: number[];
    timeBase?: number;
    currentSamplingRate: number;
    Zoom: number;
}

const Canvas = forwardRef(
    (
        {
            pauseRef,
            isConnected,
            selectedBits = 12,
            canvasCount = 6, // default value in case not provided
            timeBase = 4,
            currentSamplingRate,
            Zoom,
            selectedChannels,
        }: CanvasProps,
        ref
    ) => {
        const { theme } = useTheme();
        const canvasContainerRef = useRef<HTMLDivElement>(null);
        const [numChannels, setNumChannels] = useState<number>(selectedChannels.length);
        const dataPointCountRef = useRef<number>(2000); // To track the calculated value
        const [canvasElements, setCanvasElements] = useState<HTMLCanvasElement[]>([]);
        const [wglPlots, setWglPlots] = useState<WebglPlot[]>([]);
        const [lines, setLines] = useState<WebglLine[]>([]);
        const linesRef = useRef<WebglLine[]>([]);
        const sweepPositions = useRef<number[]>(new Array(6).fill(0)); // Array for sweep positions
        const currentSweepPos = useRef<number[]>(new Array(6).fill(0)); // Array for sweep positions
        const selectedChannelsRef = useRef(selectedChannels);

        //select point
        const getpoints = useCallback((bits: BitSelection): number => {
            switch (bits) {
                case 10:
                    return 250;
                case 12:
                case 14:
                case 16:
                    return 500;
                default:
                    return 500; // Default fallback
            }
        }, []);

        useEffect(() => {
            dataPointCountRef.current = (currentSamplingRate * timeBase);
            console.log("this is no. of points", dataPointCountRef.current);
            createCanvasElements();
        }, [timeBase
            , currentSamplingRate,isConnected
        ]);

        useEffect(() => {
            selectedChannelsRef.current = selectedChannels;
        }, [selectedChannels]);


        useEffect(() => {
            setNumChannels(selectedChannels.length);
        }, [selectedChannels]);


        useEffect(() => {
            // Reset when timeBase changes
            currentSweepPos.current = new Array(numChannels).fill(0);
            sweepPositions.current = new Array(numChannels).fill(0);
        }, [timeBase, theme]);

        useImperativeHandle(
            ref,
            () => ({
                updateData(data: number[]) {
                    // Reset the sweep positions if the number of channels has changed
                    if (currentSweepPos.current.length !== numChannels || !pauseRef.current) {
                        currentSweepPos.current = new Array(numChannels).fill(0);
                        sweepPositions.current = new Array(numChannels).fill(0);
                    }

                    if (pauseRef.current) {
                        updatePlots(data, Zoom);
                    }

                },
            }),
            [Zoom, numChannels, timeBase, selectedBits]
        );

        const createCanvasElements = useCallback(() => {
            const container = canvasContainerRef.current;
            if (!container) {
                return; // Exit if the ref is null
            }

            currentSweepPos.current = new Array(numChannels).fill(0);
            sweepPositions.current = new Array(numChannels).fill(0);

            // Clear existing child elements
            while (container.firstChild) {
                const firstChild = container.firstChild;
                if (firstChild instanceof HTMLCanvasElement) {
                    const gl = firstChild.getContext("webgl");
                    if (gl) {
                        const loseContext = gl.getExtension("WEBGL_lose_context");
                        if (loseContext) {
                            loseContext.loseContext();
                        }
                    }
                }
                container.removeChild(firstChild);
            }

            setCanvasElements([]);
            setWglPlots([]);
            linesRef.current = [];
            const newcanvasElements: HTMLCanvasElement[] = [];
            const newWglPlots: WebglPlot[] = [];
            const newLines: WebglLine[] = [];

            // Create grid lines
            const canvasWrapper = document.createElement("div");
            canvasWrapper.className = "absolute inset-0";
            const opacityDarkMajor = "0.2";
            const opacityDarkMinor = "0.05";
            const opacityLightMajor = "0.4";
            const opacityLightMinor = "0.1";
            const distanceminor = 500 * 0.04;
            const numGridLines = (getpoints(selectedBits ?? 10) * 4) / distanceminor;

            for (let j = 1; j < numGridLines; j++) {
                const gridLineX = document.createElement("div");
                gridLineX.className = "absolute bg-[rgb(128,128,128)]";
                gridLineX.style.width = "1px";
                gridLineX.style.height = "100%";
                gridLineX.style.left = `${((j / numGridLines) * 100).toFixed(3)}%`;
                gridLineX.style.opacity = j % 5 === 0 ? (theme === "dark" ? opacityDarkMajor : opacityLightMajor) : (theme === "dark" ? opacityDarkMinor : opacityLightMinor);
                canvasWrapper.appendChild(gridLineX);
            }

            const horizontalline = 50;
            for (let j = 1; j < horizontalline; j++) {
                const gridLineY = document.createElement("div");
                gridLineY.className = "absolute bg-[rgb(128,128,128)]";
                gridLineY.style.height = "1px";
                gridLineY.style.width = "100%";
                gridLineY.style.top = `${((j / horizontalline) * 100).toFixed(3)}%`;
                gridLineY.style.opacity = j % 5 === 0 ? (theme === "dark" ? opacityDarkMajor : opacityLightMajor) : (theme === "dark" ? opacityDarkMinor : opacityLightMinor);
                canvasWrapper.appendChild(gridLineY);
            }
            container.appendChild(canvasWrapper);

            // Create canvasElements for each selected channel
            selectedChannels.forEach((channelNumber) => {
                const canvasWrapper = document.createElement("div");
                canvasWrapper.className = "canvas-container relative flex-[1_1_0%]";

                const canvas = document.createElement("canvas");
                canvas.id = `canvas${channelNumber}`;
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight / selectedChannels.length;
                canvas.className = "w-full h-full block rounded-xl";

                const badge = document.createElement("div");
                badge.className = "absolute text-gray-500 text-sm rounded-full p-2 m-2";
                badge.innerText = `CH${channelNumber}`;

                canvasWrapper.appendChild(badge);
                canvasWrapper.appendChild(canvas);
                container.appendChild(canvasWrapper);

                newcanvasElements.push(canvas);
                const wglp = new WebglPlot(canvas);
                newWglPlots.push(wglp);
                wglp.gScaleY = Zoom;
                console.log("canvas", dataPointCountRef.current);
                const line = new WebglLine(getLineColor(channelNumber, theme), dataPointCountRef.current);
                wglp.gOffsetY = 0;
                line.offsetY = 0;
                line.lineSpaceX(-1, 2 / dataPointCountRef.current);

                wglp.addLine(line);
                newLines.push(line);
            });

            linesRef.current = newLines;
            setCanvasElements(newcanvasElements);
            setWglPlots(newWglPlots);
            setLines(newLines);
        }, [

            dataPointCountRef.current, currentSamplingRate, selectedChannels
        ]);

        const getLineColor = (channelNumber: number, theme: string | undefined): ColorRGBA => {
            // Convert 1-indexed channel number to a 0-indexed index
            const index = channelNumber;
            const colors = theme === "dark" ? darkThemeColors : lightThemeColors;
            const hex = colors[index % colors.length];

            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            const alpha = theme === "dark" ? 1 : 0.8;  // Slight transparency for light theme

            return new ColorRGBA(r, g, b, alpha);
        };


        const updatePlots = useCallback(
            (data: number[], Zoom: number) => {
                // Access the latest selectedChannels via the ref
                const currentSelectedChannels = selectedChannelsRef.current;
                // Adjust zoom level for each WebglPlot
                wglPlots.forEach((wglp, index) => {
                    if (wglp) {
                        try {
                            wglp.gScaleY = Zoom;
                            console.log(Zoom);
                        } catch (error) {
                            console.error(
                                `Error setting gScaleY for WebglPlot instance at index ${index}:`,
                                error
                            );
                        }
                    } else {
                        console.warn(`WebglPlot instance at index ${index} is undefined.`);
                    }
                });
                linesRef.current.forEach((line, i) => {
                    if (!line) {
                        console.warn(`Line at index ${i} is undefined.`);
                        return;
                    }

                    // Map channel number from selectedChannels
                    const channelNumber = currentSelectedChannels[i];
                    if (channelNumber == null || channelNumber < 0 || channelNumber >= data.length) {
                        console.warn(`Invalid channel number: ${channelNumber}. Skipping.`);
                        return;
                    }
                    let channelData: number;

                    if (selectedBits == 24) {
                        const bitsPoints = Math.pow(2, 23); // Adjust this according to your ADC resolution

                        channelData = data[channelNumber] / bitsPoints;
                    }
                    else {

                        const bitsPoints = Math.pow(2, selectedBits); // Adjust this according to your ADC resolution

                        channelData = data[channelNumber] * (2 / bitsPoints); // Normalize the data to -1 to 1 range
                    }
                    // Ensure sweepPositions.current[i] is initialized
                    if (sweepPositions.current[i] === undefined) {
                        sweepPositions.current[i] = 0;
                    }

                    // Calculate the current position
                    const currentPos = sweepPositions.current[i] % line.numPoints;

                    if (Number.isNaN(currentPos)) {
                        console.error(`Invalid currentPos at index ${i}. sweepPositions.current[i]:`, sweepPositions.current[i]);
                        return;
                    }

                    // Plot the data
                    try {
                        line.setY(currentPos, channelData);
                    } catch (error) {
                        console.error(`Error plotting data for line ${i} at position ${currentPos}:`, error);
                    }

                    // Clear the next point for visual effect
                    const clearPosition = Math.ceil((currentPos + dataPointCountRef.current / 100) % line.numPoints);
                    try {
                        line.setY(clearPosition, NaN);
                    } catch (error) {
                        console.error(`Error clearing data at position ${clearPosition} for line ${i}:`, error);
                    }

                    // Increment the sweep position
                    sweepPositions.current[i] = (currentPos + 1) % line.numPoints;
                });
            },
            [linesRef, wglPlots, selectedChannelsRef, dataPointCountRef, sweepPositions, selectedBits]
        );

        useEffect(() => {
            createCanvasElements();
        }, [numChannels, theme, timeBase, selectedChannels]);


        const animate = useCallback(() => {

            // If not paused, continue with normal updates (e.g., real-time plotting)
            wglPlots.forEach((wglp) => wglp.update());
            requestAnimationFrame(animate); // Continue the animation loop
        }, [dataPointCountRef.current, wglPlots, Zoom]);


        useEffect(() => {
            requestAnimationFrame(animate);

        }, [animate]);

        useEffect(() => {
            const handleResize = () => {
                createCanvasElements();

            };
            window.addEventListener("resize", handleResize);
            return () => {
                window.removeEventListener("resize", handleResize);
            };
        }, [createCanvasElements]);


        return (
            <main className=" flex flex-col flex-[1_1_0%] min-h-80 bg-highlight  rounded-2xl m-4 relative"
                ref={canvasContainerRef}
            >
            </main>
        );
    }
);
Canvas.displayName = "Canvas";
export default Canvas;
