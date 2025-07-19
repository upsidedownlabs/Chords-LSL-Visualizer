"use client";
import { core } from "@tauri-apps/api";
import React, { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

type StreamInfo = {
  name: string;
  id: string;
  type: string;
  rate: number;
  channels: number;
};

type LSLDataPayload = {
  timestamps: number[];
  samples: number[][];
  channel_names: string[];
};

export default function LSLViewer() {
  const [streamsText, setStreamsText] = useState<string>("");
  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [selectedStream, setSelectedStream] = useState<string>("");
  const [lslData, setLslData] = useState<LSLDataPayload | null>(null);

  const fetchStreams = async () => {
    const raw = await core.invoke<string>("debug_streams");
    setStreamsText(raw);

    // Extract stream names (for UI selection)
    const parsed = raw
      .split("- ")
      .slice(1)
      .map((block) => {
        const lines = block.split("\n");
        const nameId = lines[0].split(" (ID: ");
        return {
          name: nameId[0].trim(),
          id: nameId[1]?.replace(")", "").trim() || "",
          type: lines[1]?.replace("Type: ", "").trim(),
          rate: parseFloat(lines[2]?.replace("Rate: ", "") || "0"),
          channels: parseInt(lines[3]?.replace("Channels: ", "") || "0"),
        };
      });

    setStreams(parsed);
  };

  const connectToStream = async () => {
    if (!selectedStream) return;
    console.log(`Connecting to stream: ${selectedStream}`)
    await core.invoke("connect_to_stream", { streamName: selectedStream });
  };

  useEffect(() => {
    const unlisten = listen<LSLDataPayload>("lsl_data", (event) => {
      setLslData(event.payload);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <div className="p-6 space-y-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold">LSL Stream Visualizer
</h1>

      <button
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        onClick={fetchStreams}
      >
        Refresh Streams
      </button>

      {streams.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg">Select a Stream</h2>
          <select
            className="p-2 rounded bg-gray-800 border border-gray-600"
            value={selectedStream}
            onChange={(e) => setSelectedStream(e.target.value)}
          >
            <option value="">-- Select --</option>
            {streams.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name} (Rate: {s.rate}, Ch: {s.channels})
              </option>
            ))}
          </select>
          <button
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            onClick={connectToStream}
          >
            Connect
          </button>
        </div>
      )}

      {lslData && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Incoming Data:</h3>
          <p>
            <strong>Timestamp:</strong> {lslData.timestamps[0].toFixed(3)}
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {lslData.samples.map((sample, i) => (
              <div
                key={i}
                className="bg-gray-800 p-2 rounded border border-gray-700"
              >
                <strong>{lslData.channel_names[i]}</strong>:{" "}
                {sample.map((v) => v.toFixed(3)).join(", ")}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-lg font-semibold">Raw Stream Output:</h3>
        <pre className="whitespace-pre-wrap text-sm bg-gray-800 p-4 rounded border border-gray-700 overflow-auto max-h-80">
          {streamsText}
        </pre>
      </div>
    </div>
  );
}
