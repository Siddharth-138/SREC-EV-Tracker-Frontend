"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import io from 'socket.io-client';
import Image from 'next/image';
import supabase from '../../utils/supabase/client';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RaceCar = {
  url: '/racingcar.png',
  scaledSize: { width: 38, height: 38 },
  origin: { x: 0, y: 0 },
  anchor: { x: 19, y: 19 },
};

const SosIcon = {
  url: '/sos.png',
  scaledSize: { width: 38, height: 38 },
  origin: { x: 0, y: 0 },
  anchor: { x: 19, y: 19 },
};

const audio = typeof window !== 'undefined' ? new Audio("alert.mp3") : null;

function DashBoard() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: ['geometry']
  });

  const [SlidingMarker, setSlidingMarker] = useState(null);
  const [cars, setCars] = useState(new Map());
  const [mapCenter, setMapCenter] = useState({ lat: 11.10223, lng: 76.9659 });
  const [sosMessages, setSosMessages] = useState(new Map());
  const [trackData, setTrackData] = useState([]);
  const [newTrackData, setNewTrackData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    zoom: ""
  });
  const [paths, setPaths] = useState(new Map());
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());

  useEffect(() => {
    if (isLoaded) {
      import('marker-animate-unobtrusive').then((module) => {
        const SlidingMarker = module.default || module;
        SlidingMarker.initializeGlobally();
        setSlidingMarker(() => SlidingMarker);
      });
    }
  }, [isLoaded]);

  const getTimestamp = () => {
    const date = new Date();
    return date.toISOString();
  };

  const updateCarData = useCallback((data) => {
    console.log('hit ', data, getTimestamp());
    setCars((prevCars) => {
      const newCars = new Map(prevCars);
      data.forEach(car => {
        newCars.set(car.carId, car);
        updatePath(car.carId, { lat: car.latitude, lng: car.longitude });
      });
      return newCars;
    });
  }, []);

  const updatePath = (carId, position) => {
    setPaths(prevPaths => {
      const newPaths = new Map(prevPaths);
      const carPath = newPaths.get(carId) || [];
      newPaths.set(carId, [...carPath, position].slice(-100)); // Keep last 100 points
      return newPaths;
    });
  };

  const updateCarStatus = useCallback((dataArray) => {
    const data = dataArray[0];
    console.log('ok is hit');
    setSosMessages((prevMessages) => {
      const newMessages = new Map(prevMessages);
      newMessages.delete(data.carId);
      if (newMessages.size === 0 && audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      return newMessages;
    });
  }, []);

  useEffect(() => {
    const getTrackData = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*');

      if (error) {
        console.error(error);
        return;
      }
      if (data.length > 0) {
        setTrackData(data);
      }
    };
    getTrackData();

    const socket = io('http://localhost:3000');

    socket.on('locationUpdate', updateCarData);
    socket.on('ok', updateCarStatus);

    socket.on('sos', (data) => {
      setSosMessages((prevMessages) => {
        console.log('sos is hit');
        const newMessages = new Map(prevMessages);
        newMessages.set(data.carId, data.message);
        if (audio) audio.play();
        readMessage(data.carId, data.message);
        return newMessages;
      });
    });

    return () => socket.disconnect();
  }, [updateCarData, updateCarStatus]);

  const readMessage = (carId, message) => {
    if (typeof window !== 'undefined') {
      const msg = new SpeechSynthesisUtterance(`${carId}: ${message}`);
      window.speechSynthesis.speak(new SpeechSynthesisUtterance("SOS Alert"));
      window.speechSynthesis.speak(msg);
    }
  };

  const handleCarInfoClick = useCallback((lat, lng) => {
    setMapCenter({ lat, lng });
  }, []);

  const handleSosAlertClick = useCallback(() => {
    setSosMessages(new Map());
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setMapCenter({ lat: 11.10223, lng: 76.9659 }); // Reset to default center (SREC)
  }, []);

  const handleAddNewTrack = async () => {
    if (!newTrackData.name || !newTrackData.latitude || !newTrackData.longitude || !newTrackData.zoom) {
      alert('Please fill out all fields.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tracks')
        .insert([
          {
            name: newTrackData.name,
            latitude: parseFloat(newTrackData.latitude),
            longitude: parseFloat(newTrackData.longitude),
            zoom: parseInt(newTrackData.zoom)
          }
        ])
        .select();

      if (error) {
        console.error(error);
        return;
      }

      if (data && data.length > 0) {
        console.log('New track added:', data);
        setTrackData([...trackData, data[0]]);
        setNewTrackData({
          name: "",
          latitude: "",
          longitude: "",
          zoom: ""
        });
      }
    } catch (error) {
      console.error('Error adding new track:', error.message);
    }
  };

  const handleRaceTrackChange = (event) => {
    if (event.target.value === "d") return;
    const selectedTrackId = event.target.value;
    const selectedTrack = trackData.find(track => track.id === parseInt(selectedTrackId));
    if (selectedTrack) {
      setMapCenter({ lat: selectedTrack.latitude, lng: selectedTrack.longitude });
    } else {
      setMapCenter({ lat: 11.10223, lng: 76.9659 });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTrackData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const AnimatedMarker = React.memo(({ position, carId }) => {
    const markerRef = useRef(null);

    useEffect(() => {
      if (!markerRef.current && SlidingMarker) {
        const newMarker = new SlidingMarker({
          position,
          duration: 1000,
          easing: 'easeOutQuad'
        });
        markerRef.current = newMarker;
        markersRef.current.set(carId, newMarker);
      } else if (markerRef.current) {
        markerRef.current.setPosition(position);
      }
    }, [position, carId, SlidingMarker]);

    return null;
  });

  const sortedCars = useMemo(() => Array.from(cars.values()).sort((a, b) => a.carId - b.carId), [cars]);

  if (!isLoaded || !SlidingMarker) return <div>Loading...</div>;

  return (
    <>
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="flex flex-col min-h-screen">
        <Dialog>
          <header className="p-0 text-white bg-slate-900">
            <div className="flex flex-row items-center w-full p-4">
              <Image
                src="/blueband_logo.png"
                width={50}
                height={50}
                alt="BlueBand Sports Logo"
              />
              <h1 className="ml-3 text-2xl font-bold">BlueBand Sports</h1>
              <select className="w-auto h-10 p-2 ml-auto text-lg font-bold rounded-lg bg-slate-900 hover:cursor-pointer" onChange={handleRaceTrackChange}>
                <option value="d" className='bg-slate-400'>Select a track</option>
                {trackData.map((track) => (
                  <option key={track.id} value={track.id}>{track.name}</option>
                ))}
              </select>
              <DialogTrigger asChild className='w-4 ml-8'>
                <Button variant="outline" className='bg-slate-600'>+</Button>
              </DialogTrigger>
            </div>
          </header>
          <div className='flex flex-col flex-grow md:flex-row'>
            <div className='flex md:w-[20%] w-[100%] bg-gray-900 shadow-md rounded-r-md'>
              <div className='flex-row flex-grow hidden p-4 md:flex md:flex-col hide-scrollbar overflow-y-auto' style={{ maxHeight: 'calc(100vh - 4rem)' }}>
                <h1 className='text-xl font-bold text-white'>Cars</h1>
                {sortedCars.map((car) => (
                  <CarInfo key={car.carId} car={car} sosMessages={sosMessages} onClick={handleCarInfoClick} />
                ))}
              </div>
            </div>
            <main className="flex flex-col flex-grow min-h-[100%]">
              {sosMessages.size > 0 && (
                <div onDoubleClick={handleSosAlertClick} className="relative px-4 py-3 text-red-700 bg-red-100 border border-red-400 rounded h-max" role="alert">
                  <strong className="font-bold">SOS Alerts:</strong>
                  <ul className="pl-5 mt-2 list-disc">
                    {Array.from(sosMessages.entries()).map(([carId, message], index) => (
                      <li key={index}>{carId}: {message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {cars.size > 0 ? (
                <GoogleMap
                  mapContainerClassName="map-container"
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={mapCenter}
                  zoom={18}
                  onLoad={(map) => {
                    mapRef.current = map;
                  }}
                >
                  {sortedCars.map((car) => (
                    <React.Fragment key={car.carId}>
                      <AnimatedMarker
                        position={{ lat: car.latitude, lng: car.longitude }}
                        carId={car.carId}
                      />
                      <Marker
                        position={{ lat: car.latitude, lng: car.longitude }}
                        icon={sosMessages.has(car.carId) ? SosIcon : RaceCar}
                      >
                        {/* Add your popup content here if needed */}
                      </Marker>
                      <Polyline
                        path={paths.get(car.carId) || []}
                        options={{
                          strokeColor: "#FF0000",
                          strokeOpacity: 1.0,
                          strokeWeight: 2
                        }}
                      />
                    </React.Fragment>
                  ))}
                </GoogleMap>
              ) : (
                <div className='flex items-center justify-center flex-grow'>
                  <h1>Tracking Not Enabled</h1>
                </div>
              )}
            </main>
          </div>

          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Track</DialogTitle>
              <DialogDescription>
                Enter all details of track.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid items-center grid-cols-4 gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input id="name" name="name" value={newTrackData.name} onChange={handleInputChange} className="col-span-3 font-bold text-slate-500" />
              </div>
              <div className="grid items-center grid-cols-4 gap-4">
                <Label htmlFor="latitude" className="text-right">
                  Latitude
                </Label>
                <Input id="latitude" name="latitude" value={newTrackData.latitude} onChange={handleInputChange} className="col-span-3 font-bold text-slate-500" />
              </div>
              <div className="grid items-center grid-cols-4 gap-4">
                <Label htmlFor="longitude" className="text-right">
                  Longitude
                </Label>
                <Input id="longitude" name="longitude" value={newTrackData.longitude} onChange={handleInputChange} className="col-span-3 font-bold text-slate-500" />
              </div>
              <div className="grid items-center grid-cols-4 gap-4">
                <Label htmlFor="zoom" className="text-right">
                  Zoom
                </Label>
                <Input id="zoom" name="zoom" value={newTrackData.zoom} onChange={handleInputChange} className="col-span-3 font-bold text-slate-500" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddNewTrack}>Add track</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}


const CarInfo = ({ car, sosMessages, onClick }) => {
  const hasSos = sosMessages.has(parseInt(car.carId));
  // console.log('--',sosMessages);
  // console.log('R/G', hasSos, car.carId);
  return (
    <div
      className={`relative flex flex-col mt-2 p-2 rounded-lg cursor-pointer ${hasSos ? 'border-4 border-red-600 animate-blinking' : 'border border-green-300 bg-green-500'}`}
      onClick={() => onClick(car.latitude, car.longitude)}
    >
      <span className='font-bold text-white'>Car: {car.carId}</span>
      <span className='text-white'>Latitude: { (parseFloat(car.latitude).toFixed(4)) }</span>
      <span className='text-white'>Longitude: {(parseFloat(car.longitude).toFixed(4))}</span>
      <span className='text-white'>Speed: {parseFloat(car.speed).toFixed(1)} kmph</span>
    </div>
  );
};

export default DashBoard;