"use client";

import Connection from "./Connection";
import React, { useState, useCallback, useRef } from "react";
import Canvas from "./Canvas";
import Navbar from "./Navbar"; // Import the Navbar


export type BitSelection = 10 | 12 | 14 | 16 | 24;

const DataPass = () => {
  const [selectedBits, setSelectedBits] = useState<BitSelection>(10); // Default to 10
  const [isConnected, setIsConnected] = useState<boolean>(false); // Connection status
  const [isDisplay, setIsDisplay] = useState<boolean>(true); // Display state
  const [canvasCount, setCanvasCount] = useState<number>(1); // Number of canvases
  const [timeBase, setTimeBase] = useState<number>(4); // To track the current index to show
  const [currentSamplingRate, setCurrentSamplingRate] = useState<number>(500);
  const [channelCount, setChannelCount] = useState<number>(1); // Number of channels
  const canvasRef = useRef<any>(null); // Create a ref for the Canvas component
  const [selectedChannels, setSelectedChannels] = useState<number[]>([0]);
  const [Zoom, SetZoom] = useState<number>(1); // Number of canvases
  const pauseRef = useRef<boolean>(true);
  const handlePauseChange = (newPauseState: boolean) => {
    pauseRef.current = newPauseState;
  };
  const snapShotRef = useRef<boolean[]>(Array(6).fill(false));
  const datastream = useCallback((data: number[]) => {

    if (canvasRef.current) {
      canvasRef.current.updateData(data); // Assuming data is the new data to be displayed
    }
  }, []);
  return (
    <div className="flex flex-col h-screen m-0 p-0 bg-g ">
      <div className="bg-highlight">
        <Navbar isDisplay={isDisplay} />
      </div>
        <Canvas
          pauseRef={pauseRef}
          Zoom={Zoom}
          ref={canvasRef} // Pass the ref to the Canvas component
          selectedBits={selectedBits}
          isDisplay={isDisplay}
          canvasCount={canvasCount} // Pass canvas count
          selectedChannels={selectedChannels}
          timeBase={timeBase}
          currentSamplingRate={currentSamplingRate}
          isConnected={isConnected}
        />
      <Connection
        onPauseChange={handlePauseChange}
        datastream={datastream}
        Connection={setIsConnected}
        selectedBits={selectedBits}
        isDisplay={isDisplay}
        setIsDisplay={setIsDisplay}
        setCanvasCount={setCanvasCount}
        setTimeBase={setTimeBase}
        selectedChannels={selectedChannels}
        setSelectedChannels={setSelectedChannels}
        timeBase={timeBase}
        setCurrentSamplingRate={setCurrentSamplingRate}
        currentSamplingRate={currentSamplingRate}
        channelCount={channelCount}
        SetZoom={SetZoom}
        setSelectedBits={setSelectedBits}
        Zoom={Zoom}
      />
    </div>
  );
};

export default DataPass;