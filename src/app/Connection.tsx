"use client";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { EXGFilter, Notch, five } from './filters';
import { useTheme } from "next-themes";
import { core } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";
import { getCustomColor } from './Colors';

import {
    Circle,
    CircleX,
    BarChart3,
    CircleOff,
    ReplaceAll,
    Heart,
    Brain,
    Eye,
    BicepsFlexed,
    Info,
    Settings,
    CheckCircle,
    RefreshCw
} from "lucide-react";
import {
    TooltipProvider,
} from "./ui/tooltip";
import { Separator } from "./ui/separator";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "./ui/popover";
import { BitSelection } from "./page";

type StreamInfo = {
    name: string;
    host: string;
    type: string;
    rate: number;
    channels: number;
    source: string;  // Changed from 'id' to 'source' to match your data structure
};

type LSLDataPayload = {
    timestamps: number[];
    samples: number[][];
    channel_names: string[];
};
interface ConnectionProps {
    onPauseChange: (pause: boolean) => void; // Callback to pass pause state to parent
    datastream: (data: number[]) => void;
    Connection: (isDeviceConnected: boolean) => void;
    isDisplay: boolean;
    setIsDisplay: React.Dispatch<React.SetStateAction<boolean>>;
    setCanvasCount: React.Dispatch<React.SetStateAction<number>>; // Specify type for setCanvasCount
    selectedChannels: number[]; // Array of selected channel indices
    setSelectedChannels: React.Dispatch<React.SetStateAction<number[]>>; // State updater for selectedChannels
    channelCount: number;
    timeBase: number;
    setTimeBase: React.Dispatch<React.SetStateAction<number>>;
    SetZoom: React.Dispatch<React.SetStateAction<number>>;
    currentSamplingRate: number;
    setCurrentSamplingRate: React.Dispatch<React.SetStateAction<number>>;
    setSelectedBits: React.Dispatch<React.SetStateAction<BitSelection>>;
    selectedBits?: BitSelection;
    Zoom: number;
}

const Connection: React.FC<ConnectionProps> = ({
    selectedBits = 12,
    onPauseChange,
    datastream,
    Connection,
    isDisplay,
    setIsDisplay,
    setCanvasCount,
    setSelectedChannels,
    selectedChannels,
    SetZoom,
    Zoom,
    timeBase,
    setTimeBase,
    setSelectedBits,
    currentSamplingRate,
    setCurrentSamplingRate
}) => {

    // States and Refs for Connection & Recording
    const [isDeviceConnected, setIsDeviceConnected] = useState<boolean>(false); // Track if the device is connected
    const isDeviceConnectedRef = useRef<boolean>(false); // Ref to track if the device is connected
    const isRecordingRef = useRef<boolean>(false); // Ref to track if the device is recording
    // UI States for Popovers and Buttons
    const [isAllEnabledChannelSelected, setIsAllEnabledChannelSelected] = useState(false);
    const [isSelectAllDisabled, setIsSelectAllDisabled] = useState(false);
    const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
    const [isSettingOpen, setIsSettingOpen] = useState(false);
    const [manuallySelected, setManuallySelected] = useState(false); // New state to track manual selection
    const devicenameref = useRef<string>("");
    // UI Themes & Modes
    const { theme } = useTheme(); // Current theme of the app
    const isDarkModeEnabled = theme === "dark"; // Boolean to check if dark mode is enabled
    const activeTheme: 'light' | 'dark' = isDarkModeEnabled ? 'dark' : 'light';
    const [hoveredStream, setHoveredStream] = useState<StreamInfo | null>(null);
    const [streams, setStreams] = useState<StreamInfo[]>([]);
    const [selectedStream, setSelectedStream] = useState<{ name: string, sourceId: string } | null>(null);
    const listenerRefs = useRef<(() => void)[]>([]);

    const fetchStreams = async () => {
        const raw = await core.invoke<string>("debug_streams");

        // Extract stream information from the new format
        const parsed = raw
            .split("- Name: ")
            .slice(1)
            .map((block) => {
                const lines = block.split("\n").map(line => line.trim());
                const name = lines[0]?.trim() || "Unnamed Stream";
                const host = lines[1]?.replace("Host: ", "").trim() || "";
                const sourceId = lines[2]?.replace("Source ID: ", "").trim() || "";
                const type = lines[3]?.replace("Type: ", "").trim() || "unknown";
                const rate = parseFloat(lines[4]?.replace("Rate: ", "").replace(" Hz", "") || "0");
                const channels = parseInt(lines[5]?.replace("Channels: ", "") || "0", 10);

                return {
                    name,
                    host,
                    id: sourceId,
                    type,
                    rate,
                    channels,
                    source: sourceId,
                };
            });

        setStreams(parsed);
    };
    const connectToStream = async () => {
        if (!selectedStream) return;
        console.log(`Connecting to stream: ${selectedStream}`)
        await core.invoke("connect_to_stream", {
            streamName: selectedStream.name,
            sourceId: selectedStream.sourceId
        }); 
        setIsSettingOpen(false);
        Connection(true);
        setIsDeviceConnected(true);
        onPauseChange(true);
        setIsDisplay(true);
        setCanvasCount(1);
        isDeviceConnectedRef.current = true;
    };
    const disconnectFromStream = async () => {
        if (!isDeviceConnectedRef.current) return;
        console.log("Disconnecting from stream");
        await core.invoke("disconnect_stream");
        Connection(false);
        setIsDeviceConnected(false);
        onPauseChange(false);
        setIsDisplay(false);
        setCanvasCount(0);
        isDeviceConnectedRef.current = false;
    };
    const maxCanvasElementCountRef = useRef<number>(1);
    useEffect(() => {
        let unlisten: () => void;
        let mounted = true;

        const setupListener = async () => {
            try {
                unlisten = await listen<number>("lsl_channel_count", (event) => {
                    if (mounted) {
                        console.log("Nominal Sample Rate (from LSL):", event.payload);
                        maxCanvasElementCountRef.current = event.payload;
                    }
                });
                listenerRefs.current.push(unlisten);
            } catch (error) {
                console.error("Error setting up listener:", error);
            }
        };

        setupListener();

        return () => {
            mounted = false;
            if (unlisten) {
                unlisten();
            }
            // Clean up from the ref array
            const index = listenerRefs.current.indexOf(unlisten);
            if (index !== -1) {
                listenerRefs.current.splice(index, 1);
            }
        };
    }, []);

    const Filter = Array.from({ length: 16 }, () => new five());
    const EXGFilters = Array.from({ length: 16 }, () => new EXGFilter());
    const notchFilters = Array.from({ length: 16 }, () => new Notch());
    useEffect(() => {
        let unlistenPromise: Promise<() => void>;
        let mounted = true;

        const setupListener = async () => {
            try {
                unlistenPromise = listen<number>("lsl_nominal_srate", (event) => {
                    if (mounted) {
                        console.log("Nominal Sample Rate (from LSL):", event.payload);
                        setCurrentSamplingRate(event.payload);
                    }
                });
                const unlisten = await unlistenPromise;
                listenerRefs.current.push(unlisten);
            } catch (error) {
                console.error("Error setting up listener:", error);
            }
        };

        setupListener();

        return () => {
            mounted = false;
            if (unlistenPromise) {
                unlistenPromise.then(unlisten => unlisten()).catch(console.error);
            }
        };
    }, []);
    notchFilters.forEach((filter) => {
        filter.setbits(currentSamplingRate); // Set the bits value for all instances
    });
    EXGFilters.forEach((filter) => {
        filter.setbits(currentSamplingRate); // Set the bits value for all instances
    });
    Filter.forEach((filter) => {
        filter.setbits(currentSamplingRate); // Set the bits value for all instances
    });
    useEffect(() => {
        let unlistenPromise: Promise<() => void>;
        let mounted = true;

        const setupListener = async () => {
            try {
                unlistenPromise = listen<LSLDataPayload>("lsl_data", (event) => {
                    if (!mounted) return;

                    event.payload.samples.forEach(sample => {
                        const channelData: number[] = [];
                        sample.forEach((ch, channelIndex) => {
                            if (selectedBits === 24) {
                                const filteredSample = Filter[channelIndex].process(ch);
                                const processedSample = notchFilters[channelIndex].process(
                                    EXGFilters[channelIndex].process(
                                        filteredSample,
                                        appliedEXGFiltersRef.current[channelIndex]
                                    ),
                                    appliedFiltersRef.current[channelIndex]
                                );
                                channelData.push(processedSample);
                            } else {
                                const filteredSample = Filter[channelIndex].process(ch);
                                const processedSample = notchFilters[channelIndex].process(
                                    EXGFilters[channelIndex].process(
                                        filteredSample,
                                        appliedEXGFiltersRef.current[channelIndex]
                                    ),
                                    appliedFiltersRef.current[channelIndex]
                                );
                                channelData.push(processedSample);
                            }
                        });
                        datastream(channelData);
                    });
                });

                const unlisten = await unlistenPromise;
                listenerRefs.current.push(unlisten);
            } catch (error) {
                console.error("Error setting up listener:", error);
            }
        };

        setupListener();

        return () => {
            mounted = false;
            if (unlistenPromise) {
                unlistenPromise.then(unlisten => unlisten()).catch(console.error);
            }
        };
    }, [datastream, selectedBits]);


    const channelNames = Array.from({ length: maxCanvasElementCountRef.current }, (_, i) => `CH${i + 1}`);
    useEffect(() => {
        let unlistenPromise: Promise<() => void>;
        let mounted = true;

        const setupListener = async () => {
            try {
                unlistenPromise = listen<string>("resolution", event => {
                    if (!mounted) return;

                    const resolutionStr = event.payload;
                    const resolutionInt = parseInt(resolutionStr, 10);
                    setSelectedBits(resolutionInt as BitSelection);
                    console.log("Received channel resolution as integer:", resolutionInt);
                });

                const unlisten = await unlistenPromise;
                listenerRefs.current.push(unlisten);
            } catch (error) {
                console.error("Error setting up listener:", error);
            }
        };

        setupListener();

        return () => {
            mounted = false;
            if (unlistenPromise) {
                unlistenPromise.then(unlisten => unlisten()).catch(console.error);
            }
        };
    }, []);

    useEffect(() => {
        return () => {
            listenerRefs.current.forEach(unlisten => {
                try {
                    unlisten();
                } catch (error) {
                    console.error("Error cleaning up listener:", error);
                }
            });
            listenerRefs.current = [];
        };
    }, []);
    useEffect(() => {
        if (!devicenameref.current || maxCanvasElementCountRef.current === undefined) return;

        const enabledChannels = Array.from({ length: maxCanvasElementCountRef.current }, (_, i) => i + 1);

        // Retrieve saved devices from localStorage
        const savedPorts = JSON.parse(localStorage.getItem("savedDevices") || "[]");

        let initialSelectedChannelsRefs: number[] = []; // Default to channel 1

        setSelectedChannels(initialSelectedChannelsRefs);

        // Determine "Select All" state
        const allSelected = initialSelectedChannelsRefs.length === enabledChannels.length;
        setIsAllEnabledChannelSelected(allSelected);
        setIsSelectAllDisabled(initialSelectedChannelsRefs.length === enabledChannels.length - 1);
    }, [maxCanvasElementCountRef.current]);


    useEffect(() => {
        const enabledChannels = Array.from({ length: maxCanvasElementCountRef.current }, (_, i) => i + 1);

        const allSelected = selectedChannels.length === enabledChannels.length;
        const onlyOneLeft = selectedChannels.length === enabledChannels.length - 1;

        setIsSelectAllDisabled((allSelected && manuallySelected) || onlyOneLeft);

        // Update the "Select All" button state
        setIsAllEnabledChannelSelected(allSelected);
    }, [selectedChannels, maxCanvasElementCountRef.current, manuallySelected]);

    const handleSelectAllToggle = () => {
        const enabledChannels = Array.from({ length: maxCanvasElementCountRef.current }, (_, i) => i);

        if (!isAllEnabledChannelSelected) {
            // Programmatic selection of all channels
            setManuallySelected(false); // Mark as not manual
            setSelectedChannels(enabledChannels); // Select all channels
        } else {
            // RESET functionality
            let initialSelectedChannelsRefs: number[] = [0]; // Default to channel 1 if no saved channels are found

            // Set the channels back to saved values
            setSelectedChannels(initialSelectedChannelsRefs); // Reset to saved channels
        }

        // Toggle the "Select All" button state
        setIsAllEnabledChannelSelected((prevState) => !prevState);
    };

    const toggleChannel = (channelIndex: number) => {
        setManuallySelected(true); // mark as manual before mutating parent state
        setSelectedChannels((prevSelected) => {
            const updatedChannels = prevSelected.includes(channelIndex)
                ? prevSelected.filter((ch) => ch !== channelIndex)
                : [...prevSelected, channelIndex];

            const sortedChannels = updatedChannels.sort((a, b) => a - b);
            if (sortedChannels.length === 0) sortedChannels.push(0);
            return sortedChannels;
        });
    };
    const appliedFiltersRef = React.useRef<{ [key: number]: number }>({});
    const appliedEXGFiltersRef = React.useRef<{ [key: number]: number }>({});
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
    const [, forceEXGUpdate] = React.useReducer((x) => x + 1, 0);

    const removeEXGFilter = (channelIndex: number) => {
        delete appliedEXGFiltersRef.current[channelIndex]; // Remove the filter for the channel
        forceEXGUpdate(); // Trigger re-render

    };

    // Function to handle frequency selection
    const handleFrequencySelectionEXG = (channelIndex: number, frequency: number) => {
        appliedEXGFiltersRef.current[channelIndex] = frequency; // Update the filter for the channel
        forceEXGUpdate(); //Trigger re-render

    };

    // Function to set the same filter for all channels
    const applyEXGFilterToAllChannels = (channels: number[], frequency: number) => {
        channels.forEach((channelIndex) => {
            appliedEXGFiltersRef.current[channelIndex] = frequency; // Set the filter for the channel
        });
        forceEXGUpdate(); // Trigger re-render

    };
    // Function to remove the filter for all channels
    const removeEXGFilterFromAllChannels = (channels: number[]) => {
        channels.forEach((channelIndex) => {
            delete appliedEXGFiltersRef.current[channelIndex]; // Remove the filter for the channel
        });
        forceEXGUpdate(); // Trigger re-render

    };
    const removeNotchFilter = (channelIndex: number) => {
        delete appliedFiltersRef.current[channelIndex]; // Remove the filter for the channel
        forceUpdate(); // Trigger re-render
    };
    // Function to handle frequency selection
    const handleFrequencySelection = (channelIndex: number, frequency: number) => {
        appliedFiltersRef.current[channelIndex] = frequency; // Update the filter for the channel
        forceUpdate(); //Trigger re-render
    };

    // Function to set the same filter for all channels
    const applyFilterToAllChannels = (channels: number[], frequency: number) => {
        channels.forEach((channelIndex) => {
            appliedFiltersRef.current[channelIndex] = frequency; // Set the filter for the channel
        });
        forceUpdate(); // Trigger re-render
    };

    // Function to remove the filter for all channels
    const removeNotchFromAllChannels = (channels: number[]) => {
        channels.forEach((channelIndex) => {
            delete appliedFiltersRef.current[channelIndex]; // Remove the filter for the channel
        });
        forceUpdate(); // Trigger re-render
    };
    useEffect(() => {
        setSelectedChannels(selectedChannels)

    }, [selectedChannels]);


    const StreamTooltip = ({ stream }: { stream: StreamInfo }) => (
        <div className="absolute z-10 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg text-sm w-64 -top-12 left-8">
            <div className="space-y-1">
                <div><strong>Name:</strong> {stream.name}</div>
                <div><strong>Host:</strong> {stream.host}</div>
                <div><strong>Type:</strong> {stream.type}</div>
                <div><strong>Sample Rate:</strong> {stream.rate} Hz</div>
                <div><strong>Channels:</strong> {stream.channels}</div>
                <div><strong>Source ID:</strong> {stream.source}</div>
            </div>
        </div>
    );
    return (
        <div className="flex-none items-center justify-center pb-4 bg-g z-10">
            {/* Left-aligned section */}


            {/* Center-aligned buttons */}
            <div className="flex gap-3 items-center justify-center">
                {/* Connection button with tooltip */}
                {isDeviceConnected && (
                    <Button
                        className="flex items-center gap-1 py-2 px-4 rounded-xl font-semibold"
                        onClick={disconnectFromStream}
                    >
                        <>
                            Disconnect
                            <CircleX size={17} />
                        </>

                    </Button>
                )}


                {isDeviceConnected && (
                    <Popover
                        open={isFilterPopoverOpen}
                        onOpenChange={setIsFilterPopoverOpen}
                    >
                        <PopoverTrigger asChild>
                            <Button
                                className="flex items-center justify-center px-3 py-2 select-none min-w-12 whitespace-nowrap rounded-xl"
                            >
                                Filter
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-50 p-4 mx-4 mb-2">
                            <div className="flex flex-col max-h-80 overflow-y-auto">
                                <div className="flex items-center pb-2 ">
                                    {/* Filter Name */}
                                    <div className="text-sm font-semibold w-12"><ReplaceAll size={20} /></div>
                                    {/* Buttons */}
                                    <div className="flex space-x-2">
                                        <div className="flex items-center border border-input rounded-xl mx-0 px-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeEXGFilterFromAllChannels(Array.from({ length: maxCanvasElementCountRef.current }, (_, i) => i))}
                                                className={`rounded-xl rounded-r-none border-0
                        ${Object.keys(appliedEXGFiltersRef.current).length === 0
                                                        ? "bg-red-700 hover:bg-white-500 hover:text-white text-white" // Disabled background
                                                        : "bg-white-500" // Active background
                                                    }`}
                                            >
                                                <CircleOff size={17} />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => applyEXGFilterToAllChannels(Array.from({ length: maxCanvasElementCountRef.current }, (_, i) => i), 4)}
                                                className={`flex items-center justify-center px-3 py-2 rounded-none select-none border-0
                        ${Object.keys(appliedEXGFiltersRef.current).length === maxCanvasElementCountRef.current && Object.values(appliedEXGFiltersRef.current).every((value) => value === 4)
                                                        ? "bg-green-700 hover:bg-white-500 text-white hover:text-white" // Disabled background
                                                        : "bg-white-500" // Active background
                                                    }`}
                                            >
                                                <BicepsFlexed size={17} />
                                            </Button> <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => applyEXGFilterToAllChannels(Array.from({ length: maxCanvasElementCountRef.current }, (_, i) => i), 3)}
                                                className={`flex items-center justify-center px-3 py-2 rounded-none select-none border-0
                        ${Object.keys(appliedEXGFiltersRef.current).length === maxCanvasElementCountRef.current && Object.values(appliedEXGFiltersRef.current).every((value) => value === 3)
                                                        ? "bg-green-700 hover:bg-white-500 text-white hover:text-white" // Disabled background
                                                        : "bg-white-500" // Active background
                                                    }`}
                                            >
                                                <Brain size={17} />
                                            </Button> <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => applyEXGFilterToAllChannels(Array.from({ length: maxCanvasElementCountRef.current }, (_, i) => i), 1)}
                                                className={`flex items-center justify-center px-3 py-2 rounded-none select-none border-0
                        ${Object.keys(appliedEXGFiltersRef.current).length === maxCanvasElementCountRef.current && Object.values(appliedEXGFiltersRef.current).every((value) => value === 1)
                                                        ? "bg-green-700 hover:bg-white-500 text-white hover:text-white" // Disabled background
                                                        : "bg-white-500" // Active background
                                                    }`}
                                            >
                                                <Heart size={17} />
                                            </Button> <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => applyEXGFilterToAllChannels(Array.from({ length: maxCanvasElementCountRef.current }, (_, i) => i), 2)}
                                                className={`rounded-xl rounded-l-none border-0
                        ${Object.keys(appliedEXGFiltersRef.current).length === maxCanvasElementCountRef.current && Object.values(appliedEXGFiltersRef.current).every((value) => value === 2)
                                                        ? "bg-green-700 hover:bg-white-500 text-white hover:text-white" // Disabled background
                                                        : "bg-white-500" // Active background
                                                    }`}
                                            >
                                                <Eye size={17} />
                                            </Button>
                                        </div>
                                        <div className="flex border border-input rounded-xl items-center mx-0 px-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeNotchFromAllChannels(Array.from({ length: maxCanvasElementCountRef.current }, (_, i) => i))}
                                                className={`rounded-xl rounded-r-none border-0
                          ${Object.keys(appliedFiltersRef.current).length === 0
                                                        ? "bg-red-700 hover:bg-white-500 hover:text-white text-white" // Disabled background
                                                        : "bg-white-500" // Active background
                                                    }`}
                                            >
                                                <CircleOff size={17} />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => applyFilterToAllChannels(Array.from({ length: maxCanvasElementCountRef.current }, (_, i) => i), 1)}
                                                className={`flex items-center justify-center px-3 py-2 rounded-none select-none border-0
                          ${Object.keys(appliedFiltersRef.current).length === maxCanvasElementCountRef.current && Object.values(appliedFiltersRef.current).every((value) => value === 1)
                                                        ? "bg-green-700 hover:bg-white-500 text-white hover:text-white" // Disabled background
                                                        : "bg-white-500" // Active background
                                                    }`}
                                            >
                                                50Hz
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => applyFilterToAllChannels(Array.from({ length: maxCanvasElementCountRef.current }, (_, i) => i), 2)}
                                                className={`rounded-xl rounded-l-none border-0
                          ${Object.keys(appliedFiltersRef.current).length === maxCanvasElementCountRef.current && Object.values(appliedFiltersRef.current).every((value) => value === 2)
                                                        ? "bg-green-700 hover:bg-white-500 text-white hover:text-white" // Disabled background
                                                        : "bg-white-500" // Active background
                                                    }`}
                                            >
                                                60Hz
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col space-y-2">
                                    {channelNames.map((filterName, index) => (
                                        <div key={filterName} className="flex items-center">
                                            {/* Filter Name */}
                                            <div className="text-sm font-semibold w-12">{filterName}</div>
                                            {/* Buttons */}
                                            <div className="flex space-x-2">
                                                <div className="flex border border-input rounded-xl items-center mx-0 px-0">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => removeEXGFilter(index)}
                                                        className={`rounded-xl rounded-r-none border-l-none border-0
                                                        ${appliedEXGFiltersRef.current[index] === undefined
                                                                ? "bg-red-700 hover:bg-white-500 hover:text-white text-white" // Disabled background
                                                                : "bg-white-500" // Active background
                                                            }`}
                                                    >
                                                        <CircleOff size={17} />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleFrequencySelectionEXG(index, 4)}
                                                        className={`flex items-center justify-center px-3 py-2 rounded-none select-none border-0
                                                        ${appliedEXGFiltersRef.current[index] === 4
                                                                ? "bg-green-700 hover:bg-white-500 text-white hover:text-white" // Disabled background
                                                                : "bg-white-500" // Active background
                                                            }`}
                                                    >
                                                        <BicepsFlexed size={17} />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleFrequencySelectionEXG(index, 3)}
                                                        className={`flex items-center justify-center px-3 py-2 rounded-none select-none border-0
                                                      ${appliedEXGFiltersRef.current[index] === 3
                                                                ? "bg-green-700 hover:bg-white-500 text-white hover:text-white" // Disabled background
                                                                : "bg-white-500" // Active background
                                                            }`}
                                                    >
                                                        <Brain size={17} />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleFrequencySelectionEXG(index, 1)}
                                                        className={`flex items-center justify-center px-3 py-2 rounded-none select-none border-0
                                                        ${appliedEXGFiltersRef.current[index] === 1
                                                                ? "bg-green-700 hover:bg-white-500 text-white hover:text-white" // Disabled background
                                                                : "bg-white-500" // Active background
                                                            }`}
                                                    >
                                                        <Heart size={17} />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleFrequencySelectionEXG(index, 2)}
                                                        className={`rounded-xl rounded-l-none border-0
                                                        ${appliedEXGFiltersRef.current[index] === 2
                                                                ? "bg-green-700 hover:bg-white-500 text-white hover:text-white" // Disabled background
                                                                : "bg-white-500" // Active background
                                                            }`}
                                                    >
                                                        <Eye size={17} />
                                                    </Button>
                                                </div>
                                                <div className="flex border border-input rounded-xl items-center mx-0 px-0">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => removeNotchFilter(index)}
                                                        className={`rounded-xl rounded-r-none border-0
                                                        ${appliedFiltersRef.current[index] === undefined
                                                                ? "bg-red-700 hover:bg-white-500 hover:text-white text-white" // Disabled background
                                                                : "bg-white-500" // Active background
                                                            }`}
                                                    >
                                                        <CircleOff size={17} />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleFrequencySelection(index, 1)}
                                                        className={`flex items-center justify-center px-3 py-2 rounded-none select-none border-0
                                                        ${appliedFiltersRef.current[index] === 1
                                                                ? "bg-green-700 hover:bg-white-500 text-white hover:text-white" // Disabled background
                                                                : "bg-white-500" // Active background
                                                            }`}
                                                    >
                                                        50Hz
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleFrequencySelection(index, 2)}
                                                        className={
                                                            `rounded-xl rounded-l-none border-0 ${appliedFiltersRef.current[index] === 2
                                                                ? "bg-green-700 hover:bg-white-500 text-white hover:text-white "
                                                                : "bg-white-500 animate-fade-in-right"
                                                            }`
                                                        }
                                                    >
                                                        60Hz
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {!isDeviceConnected && (
                    <Button
                        className="flex items-center justify-center px-3 py-2 select-none min-w-12 whitespace-nowrap rounded-xl"
                        disabled={isDeviceConnected}
                        onClick={() => setIsSettingOpen(true)}
                    >
                        Scan LSL Stream
                    </Button>

                )}
                {isSettingOpen && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black bg-opacity-50">
                        <div className="relative p-6 space-y-6 bg-gray-900 rounded-lg shadow-xl max-w-md w-full min-h-[20vh] overflow-y-auto">
                            <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center flex-shrink-0">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select a Stream</h2>
                                </div>
                                <button
                                    onClick={() => setIsSettingOpen(false)}

                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>                </button>
                            </div>
                            {/* Stream List */}
                            <div className="space-y-3 w-full">
                                {streams.map((stream) => (
                                    <div
                                        key={stream.source}
                                        className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
                                        onClick={() => setSelectedStream({
                                            name: stream.name,
                                            sourceId: stream.source
                                        })}
                                    >
                                        <div className="flex items-center">
                                            <div>
                                                <div className="font-medium text-white">{stream.name}</div>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    className="p-2 hover:bg-gray-700 rounded"
                                                    onMouseEnter={() => setHoveredStream(stream)}
                                                    onMouseLeave={() => setHoveredStream(null)}
                                                >
                                                    <Info size={20} className="text-blue-400" />
                                                </button>
                                                {hoveredStream?.source === stream.source && (
                                                    <StreamTooltip stream={hoveredStream} />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {selectedStream?.sourceId === stream.source ? (
                                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 w-full">
                                <button
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                    onClick={fetchStreams}
                                >
                                    <RefreshCw size={16} />
                                    Refresh
                                </button>
                                <button
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={connectToStream}
                                    disabled={!selectedStream}
                                >
                                    <BarChart3 size={16} />
                                    Visualize
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {isDeviceConnected && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button className="flex items-center justify-center select-none whitespace-nowrap rounded-lg" >
                                <Settings size={16} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[30rem] p-4 rounded-md shadow-md text-sm">
                            <TooltipProvider>
                                <div className={`space-y-6 ${!isDisplay ? "flex justify-center" : ""}`}>
                                    {/* Channel Selection */}
                                    {isDisplay && !isRecordingRef.current && (
                                        <div className="flex items-center justify-center rounded-lg ">
                                            <div className="w-full">
                                                {/* Channels Count & Select All Button */}
                                                <div className="flex items-center justify-between " >
                                                    <h3 className="text-xs font-semibold text-gray-500">
                                                        <span className="font-bold text-gray-600">Channels Count:</span> {selectedChannels.length}
                                                    </h3>
                                                    {!(selectedChannels.length === maxCanvasElementCountRef.current && manuallySelected) && (
                                                        <button
                                                            onClick={handleSelectAllToggle}
                                                            className={`px-4 py-1 text-xs font-light rounded-lg transition m-2 ${isSelectAllDisabled
                                                                ? "text-gray-400 bg-gray-200 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed"
                                                                : "text-white bg-black hover:bg-gray-700 dark:bg-white dark:text-black dark:border dark:border-gray-500 dark:hover:bg-primary/70"
                                                                }`}
                                                            disabled={isSelectAllDisabled}
                                                        >
                                                            {isAllEnabledChannelSelected ? "RESET" : "Select All"}
                                                        </button>
                                                    )}
                                                </div>
                                                {/* Channel Buttons Grid */}
                                                <div id="button-container" className="relative space-y-2 rounded-lg">
                                                    {Array.from({ length: 2 }).map((_, container) => (
                                                        <div key={container} className="grid grid-cols-8 gap-2">
                                                            {Array.from({ length: 8 }).map((_, col) => {
                                                                const index = container * 8 + col;
                                                                const isChannelDisabled = index >= maxCanvasElementCountRef.current;
                                                                const isSelected = selectedChannels.includes(index);
                                                                const buttonStyle = isChannelDisabled
                                                                    ? isDarkModeEnabled
                                                                        ? { backgroundColor: "#030c21", color: "gray" }
                                                                        : { backgroundColor: "#e2e8f0", color: "gray" }
                                                                    : isSelected
                                                                        ? { backgroundColor: getCustomColor(index, activeTheme), color: "white" }
                                                                        : { backgroundColor: "white", color: "black" };
                                                                const isFirstInRow = col === 0;
                                                                const isLastInRow = col === 7;
                                                                const isFirstContainer = container === 0;
                                                                const isLastContainer = container === 1;
                                                                const roundedClass = `
                                                                ${isFirstInRow && isFirstContainer ? "rounded-tl-lg" : ""} 
                                                                ${isLastInRow && isFirstContainer ? "rounded-tr-lg" : ""} 
                                                                ${isFirstInRow && isLastContainer ? "rounded-bl-lg" : ""} 
                                                                ${isLastInRow && isLastContainer ? "rounded-br-lg" : ""}
                                                                     `;

                                                                return (
                                                                    <button
                                                                        key={index}
                                                                        onClick={() => !isChannelDisabled && toggleChannel(index)}
                                                                        disabled={isChannelDisabled}
                                                                        style={buttonStyle}
                                                                        className={`w-full h-8 text-xs font-medium py-1 border border-gray-300 dark:border-gray-600 transition-colors duration-200 ${roundedClass}`}
                                                                    >
                                                                        {`CH${index + 1}`}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Zoom Controls */}
                                    <div className={`relative w-full flex flex-col ${!isDisplay ? "" : "items-start"} text-sm`}>
                                        {/* Zoom Level label positioned at top left with margin/padding */}
                                        <p className="text-xs justify-start font-semibold text-gray-500 ">
                                            <span className="font-bold text-gray-600">Zoom Level:</span> {Zoom}x
                                        </p>
                                        <div className="relative w-[28rem] flex items-center rounded-lg py-2 border border-gray-300 dark:border-gray-600 mb-4">
                                            {/* Button for setting Zoom to 1 */}
                                            <button
                                                className="text-gray-700 dark:text-gray-400 mx-1 px-2 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                                onClick={() => SetZoom(1)}
                                            >
                                                1
                                            </button>

                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                value={Zoom}
                                                onChange={(e) => SetZoom(Number(e.target.value))}
                                                style={{
                                                    background: `linear-gradient(to right, rgb(101, 136, 205) ${((Zoom - 1) / 9) * 100}%, rgb(165, 165, 165) ${((Zoom - 1) / 9) * 100}%)`,
                                                }}
                                                className="flex-1 h-[0.15rem] rounded-full appearance-none bg-gray-800 focus:outline-none focus:ring-0 slider-input"
                                            />


                                            {/* Button for setting Zoom to 10 */}
                                            <button
                                                className="text-gray-700 dark:text-gray-400 mx-2 px-2 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                                onClick={() => SetZoom(10)}
                                            >
                                                10                                            </button>
                                            <style jsx>{` input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 15px; height: 15px;
                                            background-color: rgb(101, 136, 205); border-radius: 50%; cursor: pointer; } `}</style>
                                        </div>
                                    </div>

                                    {/* Time-Base Selection */}
                                    {isDisplay && (
                                        <div className="relative w-full flex flex-col items-start  text-sm">
                                            <p className="text-xs font-semibold text-gray-500 ">
                                                <span className="font-bold text-gray-600">Time Base:</span> {timeBase} Seconds
                                            </p>
                                            <div className="relative w-[28rem] flex items-center rounded-lg py-2 border border-gray-300 dark:border-gray-600">
                                                {/* Buttons & Slider */}
                                                <button
                                                    className="text-gray-700 dark:text-gray-400 mx-1 px-2 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                                    onClick={() => setTimeBase(1)}
                                                >
                                                    1
                                                </button>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    value={timeBase}
                                                    onChange={(e) => setTimeBase(Number(e.target.value))}
                                                    style={{
                                                        background: `linear-gradient(to right, rgb(101, 136, 205) ${((timeBase - 1) / 9) * 100}%, rgb(165, 165, 165) ${((timeBase - 1) / 9) * 11}%)`,
                                                    }}
                                                    className="flex-1 h-[0.15rem] rounded-full appearance-none bg-gray-200 focus:outline-none focus:ring-0 slider-input"
                                                />
                                                <button
                                                    className="text-gray-700 dark:text-gray-400 mx-2 px-2 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                                    onClick={() => setTimeBase(10)}
                                                >
                                                    10
                                                </button>
                                                <style jsx>{` input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none;appearance: none; width: 15px; height: 15px;
                                                background-color: rgb(101, 136, 205); border-radius: 50%; cursor: pointer; }`}</style>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TooltipProvider>
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        </div>
    );
};

export default Connection;