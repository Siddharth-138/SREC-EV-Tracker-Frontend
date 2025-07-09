"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap , Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import Image from 'next/image';
import supabase from '../../utils/supabase/client';
// import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";

// Create custom icons for Leaflet
const RaceCarIcon = L.divIcon({
  html: `
    <div style="
      width: 25px; 
      height: 25px; 
      background-image: url('/i.png'); 
      background-size: cover; 
      background-position: center;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>
    <div style="
      position: absolute;
      top: -25px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgb(232, 15, 15);
      color: white;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
      white-space: nowrap;
      border: 1px solid white;
    ">EV</div>
  `,
  className: 'custom-div-icon',
  iconSize: [25, 25],
  iconAnchor: [12.5, 12.5],
});

const SosIcon = L.divIcon({
  html: `
    <div style="
      width: 38px; 
      height: 38px; 
      background-image: url('/sos.png'); 
      background-size: cover; 
      background-position: center;
      border-radius: 50%;
      border: 3px solid red;
      box-shadow: 0 2px 8px rgba(255,0,0,0.5);
      animation: pulse 1s infinite;
    "></div>
    <div style="
      position: absolute;
      top: -25px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgb(232, 15, 15);
      color: white;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
      white-space: nowrap;
      border: 1px solid white;
    ">SOS</div>
  `,
  className: 'custom-div-icon sos-icon',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const createCustomIcon = ({ imageUrl, label, borderColor = '#333' }) => {
  return L.divIcon({
    html: `
      <div style="
        width: 10px; 
        height: 10px; 
        background-image: url('${imageUrl}'); 
        background-size: cover; 
        background-color: white;
        border-radius: 8px;
        border: 2px solid ${borderColor};
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
      "></div>
      <div style="
        position: absolute;
        top: -25px;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${borderColor};
        color: white;
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: bold;
        white-space: nowrap;
        border: 1px solid white;
      ">${label}</div>
    `,
    className: 'custom-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// ✅ Step 2: Static locations with dynamic icons
const staticLocations = [
  {
    id: 'food-court',
    name: 'Food Court',
    lat: 11.101040,
    lng: 76.964291,
    icon: createCustomIcon({
      imageUrl: '/food.jpg',
      label: 'Food Court',
      borderColor: '#ff6b35'
    }),
    description: 'Campus Food Court - Grab a bite here!',
  },
  {
    id: 'library',
    name: 'Library',
    lat: 11.102444,
    lng: 76.966510,
    icon: createCustomIcon({
      imageUrl: '/library.jpg',
      label: 'Library',
      borderColor: '#4CAF50'
    }),
    description: 'Campus Library',
  },
  {
    id: 'IT',
    name: 'IT Block',
    lat: 11.101260,
    lng: 76.965972,
    icon: createCustomIcon({
      imageUrl: '/hostel.jpg',
      label: 'IT Block',
      borderColor: '#3F51B5'
    }),
    description: 'Student Hostel',
  },
  {
    id: 'G',
    name: 'G Block',
    lat: 11.101125,
    lng: 76.965353,
    icon: createCustomIcon({
      imageUrl: '/hostel.jpg',
      label: 'G Block',
      borderColor: '#4CAF50'
    }),
    description: 'G Block'
  },
  {
    id: 'ECE_EEE',
    name: 'ECE / EEE Block',
    lat: 11.100971,
    lng: 76.966034,
    icon: createCustomIcon({
      imageUrl: '/hostel.jpg',
      label: 'ECE/EEE',
      borderColor: '#FF9800'
    }),
    description: 'Electronics and Electrical Engineering Block'
  },
  {
    id: 'C',
    name: 'C Block',
    lat: 11.101729,
    lng: 76.965843,
    icon: createCustomIcon({
      imageUrl: '/hostel.jpg',
      label: 'C Block',
      borderColor: '#F44336'
    }),
    description: 'C Block'
  },
  {
    id: 'ADMIN',
    name: 'Admin Block',
    lat: 11.102224,
    lng: 76.965714,
    icon: createCustomIcon({
      imageUrl: '/hostel.jpg',
      label: 'Admin',
      borderColor: '#9C27B0'
    }),
    description: 'Administrative Block'
  },
  {
    id: 'SPARK',
    name: 'Spark',
    lat: 11.101820,
    lng: 76.966408,
    icon: createCustomIcon({
      imageUrl: '/hostel.jpg',
      label: 'Spark',
      borderColor: '#00BCD4'
    }),
    description: 'Innovation Center - Spark'
  }
];

// Component to handle map center updates and always center on cars
const MapUpdater = ({ center, cars, followCars }) => {
  const map = useMap();
  
  useEffect(() => {
    if (followCars && cars.size > 0) {
      // Always center on the first car or average of all cars
      const carsArray = Array.from(cars.values());
      if (carsArray.length === 1) {
        // Center on single car
        const car = carsArray[0];
        map.setView([car.latitude, car.longitude], map.getZoom());
      } else {
        // Center on average position of all cars
        const avgLat = carsArray.reduce((sum, car) => sum + car.latitude, 0) / carsArray.length;
        const avgLng = carsArray.reduce((sum, car) => sum + car.longitude, 0) / carsArray.length;
        map.setView([avgLat, avgLng], map.getZoom());
      }
    } else if (center) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, cars, followCars, map]);
  
  return null;
};

// Component to handle animated marker movement
const AnimatedMarker = ({ position, carId, icon, sosMessages }) => {
  const map = useMap();
  const markerRef = useRef(null);
  
  useEffect(() => {
    if (!markerRef.current) {
      markerRef.current = L.marker([position.lat, position.lng], { icon })
        .addTo(map);
    } else {
      // Animate marker to new position
      const currentLatLng = markerRef.current.getLatLng();
      const newLatLng = L.latLng(position.lat, position.lng);
      
      // Simple animation using setLatLng with a small delay
      const animateMarker = () => {
        markerRef.current.setLatLng(newLatLng);
        markerRef.current.setIcon(sosMessages.has(carId) ? SosIcon : RaceCarIcon);
      };
      
      setTimeout(animateMarker, 100);
    }
  }, [position, carId, icon, map, sosMessages]);
  
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
    };
  }, [map]);
  
  return null;
};

const audio = typeof window !== 'undefined' ? new Audio("alert.mp3") : null;

function DashBoard() {
  const [cars, setCars] = useState(new Map());
  const [mapCenter, setMapCenter] = useState({ lat: 11.10223, lng: 76.9659 });
  const [sosMessages, setSosMessages] = useState(new Map());
  const [selectedCar, setSelectedCar] = useState(null);
  const [okMessages, setOkMessages] = useState(new Map());
  const [trackData, setTrackData] = useState([]);
  const [newTrackData, setNewTrackData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    zoom: ""
  });
  const [paths, setPaths] = useState(new Map());
  const [followCars, setFollowCars] = useState(true);
  const mapRef = useRef(null);

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
      newPaths.set(carId, [...carPath, position].slice(-100));
      return newPaths;
    });
  };

  const updateCarStatus = useCallback((dataArray) => {
    const data = dataArray[0];
    console.log('ok is hit');
    setOkMessages((prevMessages) => {
      const newMessages = new Map(prevMessages);
      const carId = typeof data.carId === 'number' ? data.carId : String(data.carId);
      newMessages.set(carId, data.message);
      return newMessages;
    });

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

    const socket = io('http://localhost:3002/');

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
    setFollowCars(false);
    setMapCenter({ lat, lng });
  }, []);

  const handleSosAlertClick = useCallback(() => {
    setSosMessages(new Map());
    setOkMessages(new Map());
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setMapCenter({ lat: 11.10223, lng: 76.9659 });
    setFollowCars(true);
  }, []);

  const handleAddNewTrack = async () => {
    if (!newTrackData.name || !newTrakData.latitude || !newTrackData.longitude || !newTrackData.zoom) {
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
      setFollowCars(false);
      setMapCenter({ lat: selectedTrack.latitude, lng: selectedTrack.longitude });
    } else {
      setFollowCars(true);
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

  const sortedCars = useMemo(() => Array.from(cars.values()).sort((a, b) => a.carId - b.carId), [cars]);

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
        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }
        .sos-icon {
          animation: pulse 1s infinite;
        }
        .custom-icon {
          z-index: 1000;
        }
        .location-icon-container:hover .location-label {
          opacity: 1;
          visibility: visible;
        }
        .location-icon-container.clicked .location-label {
          opacity: 1;
          visibility: visible;
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .leaflet-container {
          height: 100%;
          width: 100%;
        }
      `}</style>

      <div className="flex flex-col min-h-screen">
        <Dialog>
          <header className="p-0 text-white bg-orange-600">
            <div className="flex flex-row items-center w-full p-4">
              <Image
                src="/college-logo.jpg"
                width={50}
                height={50}
                alt="BlueBand Sports Logo"
              />
              <h1 className="ml-3 text-2xl font-bold">SREC EV TRACKER</h1>
            </div>
          </header>
          <div className='flex flex-col flex-grow md:flex-row'>
            
            <main className="flex flex-col flex-grow min-h-[100%] relative">
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
              {okMessages.size > 0 && (
                <div onDoubleClick={handleSosAlertClick} className="relative px-4 py-3 text-green-700 bg-green-100 border border-green-400 rounded h-max" role="alert">
                  <strong className="font-bold">OK Messages:</strong>
                  <ul className="pl-5 mt-2 list-disc">
                    {Array.from(okMessages.entries()).map(([carId, message], index) => (
                      <li key={index}>{carId}: {message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {cars.size > 0 ? (
                <div style={{ height: '100%', width: '100%' }}>
                  <MapContainer
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={19}
                    maxZoom={22}
                    style={{ height: '100%', width: '100%' }}
                    ref={mapRef}
                    attributionControl={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution=""
                      maxZoom={22}
                    />
                    
                    <MapUpdater center={mapCenter} cars={cars} followCars={followCars} />
                    
                    {/* Static Location Markers */}
                    {staticLocations.map((location) => (
                    <Marker
                      key={location.id}
                      position={[location.lat, location.lng]}
                      icon={location.icon}
                      
                    >
                      {/* Show label on hover */}
                      <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                        <span>{location.name}</span>
                      </Tooltip>

                      {/* Show details on click */}
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-bold text-lg">{location.name}</h3>
                          <p>{location.description}</p>
                          <p><strong>Latitude:</strong> {location.lat.toFixed(6)}</p>
                          <p><strong>Longitude:</strong> {location.lng.toFixed(6)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                    
                    {/* Car Markers */}
                    {sortedCars.map((car) => (
                      <Marker
                        key={car.carId}
                        position={[car.latitude, car.longitude]}
                        icon={sosMessages.has(car.carId) ? SosIcon : RaceCarIcon}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-bold text-lg">EV {car.carId}</h3>
                            <p><strong>Speed:</strong> {parseFloat(car.speed).toFixed(1)} kmph</p>
                            <p><strong>Latitude:</strong> {parseFloat(car.latitude).toFixed(6)}</p>
                            <p><strong>Longitude:</strong> {parseFloat(car.longitude).toFixed(6)}</p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              ) : (
                <div className='flex items-center justify-center flex-grow'>
                  <h1>Tracking Not Enabled</h1>
                </div>
              )}
            </main> 
          </div>        
        </Dialog>
      </div>
    </>
  );
}

// const CarInfo = ({ car, sosMessages, warning, onClick, onWarningDismiss }) => {
//   const hasSos = sosMessages.has(parseInt(car.carId));
//   return (
//     <div
//       className={`relative flex flex-col mt-2 p-2 rounded-lg cursor-pointer ${hasSos ? 'border-4 border-red-600 animate-blinking' : 'border border-green-300 bg-green-500'}`}
//       onClick={() => onClick(car.latitude, car.longitude)}
//     >
//       <span className='font-bold text-white'>Car: {car.carId}</span>
//       <span className='text-white'>Latitude: {(parseFloat(car.latitude).toFixed(4))}</span>
//       <span className='text-white'>Longitude: {(parseFloat(car.longitude).toFixed(4))}</span>
//       <span className='text-2 text-white'>Speed: {parseFloat(car.speed).toFixed(1)} kmph</span>
//     </div>
//   );
// };

export default DashBoard;