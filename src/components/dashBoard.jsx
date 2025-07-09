  "use client";
  import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
  import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from 'react-leaflet';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import io from 'socket.io-client';
  import Image from 'next/image';
  import supabase from '../../utils/supabase/client';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog";

  // Create custom icons for Leaflet
  const RaceCarIcon = L.divIcon({
    html: `
      <div style="
        width: 32px; 
        height: 32px; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <div style="
          width: 16px;
          height: 16px;
          background-image: url('/i.png');
          background-size: cover;
          background-position: center;
          border-radius: 50%;
        "></div>
      </div>
      <div style="
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ">EV</div>
    `,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const SosIcon = L.divIcon({
  html: `
    <div style="
      width: 32px; 
      height: 32px; 
      background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 16px rgba(255,65,108,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 1s infinite;
      position: relative;
    ">
      <div style="
        width: 20px;
        height: 20px;
        background-image: url('/sos.png');
        background-size: cover;
        background-position: center;
        border-radius: 50%;
      "></div>
    </div>
    <div style="
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(255,65,108,0.3);
      animation: pulse 1s infinite;
    ">SOS</div>
  `,
  className: 'custom-div-icon sos-icon',
  iconSize: [32, 32],  // Changed from [42, 42] to match RaceCarIcon
  iconAnchor: [16, 16], // Changed from [21, 21] to match RaceCarIcon
});

  const createCustomIcon = ({ imageUrl, label, borderColor = '#333' }) => {
    const gradientColors = {
      '#ff6b35': 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
      '#4CAF50': 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
      '#3F51B5': 'linear-gradient(135deg, #3F51B5 0%, #303f9f 100%)',
      '#FF9800': 'linear-gradient(135deg, #FF9800 0%, #f57c00 100%)',
      '#F44336': 'linear-gradient(135deg, #F44336 0%, #d32f2f 100%)',
      '#9C27B0': 'linear-gradient(135deg, #9C27B0 0%, #7b1fa2 100%)',
      '#00BCD4': 'linear-gradient(135deg, #00BCD4 0%, #0097a7 100%)',
    };

    const gradient = gradientColors[borderColor] || `linear-gradient(135deg, ${borderColor} 0%, ${borderColor} 100%)`;

    return L.divIcon({
      html: `
        <div style="
          width: 24px; 
          height: 24px; 
          background: ${gradient};
          border-radius: 8px;
          border: 2px solid white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 14px;
            height: 14px;
            background-image: url('${imageUrl}');
            background-size: cover;
            background-position: center;
            border-radius: 4px;
          "></div>
        </div>
        <div style="
          position: absolute;
          top: -28px;
          left: 50%;
          transform: translateX(-50%);
          background: ${gradient};
          color: white;
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
          border: 1px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        ">${label}</div>
      `,
      className: 'custom-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // Enhanced static locations with better styling
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
      category: 'dining'
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
      description: 'Campus Library - Study and research facility',
      category: 'academic'
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
      description: 'Information Technology Department',
      category: 'academic'
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
      description: 'G Block - Academic Building',
      category: 'academic'
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
      description: 'Electronics and Electrical Engineering Block',
      category: 'academic'
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
      description: 'C Block - Academic Building',
      category: 'academic'
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
      description: 'Administrative Block',
      category: 'administrative'
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
      description: 'Innovation Center - Spark',
      category: 'innovation'
    }
  ];

  // Component to handle map center updates and always center on cars
  const MapUpdater = ({ center, cars, followCars }) => {
    const map = useMap();
    
    useEffect(() => {
      if (followCars && cars.size > 0) {
        const carsArray = Array.from(cars.values());
        if (carsArray.length === 1) {
          const car = carsArray[0];
          map.setView([car.latitude, car.longitude], map.getZoom());
        } else {
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

  // Enhanced animated marker component
    const AnimatedMarker = ({ position, carId, icon, sosMessages }) => {
    const map = useMap();
    const markerRef = useRef(null);
    
    useEffect(() => {
      const currentIcon = sosMessages.has(carId) ? SosIcon : RaceCarIcon;
      
      if (!markerRef.current) {
        markerRef.current = L.marker([position.lat, position.lng], { icon: currentIcon })
          .addTo(map);
      } else {
        const newLatLng = L.latLng(position.lat, position.lng);
        
        // Update both position and icon simultaneously
        markerRef.current.setLatLng(newLatLng);
        markerRef.current.setIcon(currentIcon);
      }
    }, [position, carId, map, sosMessages]); // Added sosMessages to dependencies
    
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
    const [okMessages, setOkMessages] = useState(new Map());    
    const [paths, setPaths] = useState(new Map());
    const [followCars, setFollowCars] = useState(true);
    const [showSidebar, setShowSidebar] = useState(false);
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
        // Ensure carId is consistent type
        const carId = typeof car.carId === 'number' ? car.carId : String(car.carId);
        newCars.set(carId, { ...car, carId });
        updatePath(carId, { lat: car.latitude, lng: car.longitude });
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

      const socket = io('https://srec-ev-tracker-backend.onrender.com/');

      socket.on('locationUpdate', (data) => {
        console.log("Received location update:", data);
        updateCarData(data);
      });

      socket.on('locationUpdate', updateCarData);
      socket.on('ok', updateCarStatus);

      socket.on('sos', (data) => {
      setSosMessages((prevMessages) => {
        console.log('sos is hit');
        const newMessages = new Map(prevMessages);
        const carId = typeof data.carId === 'number' ? data.carId : String(data.carId);
        newMessages.set(carId, data.message);
        if (audio) audio.play();
        readMessage(carId, data.message);
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
          @keyframes slideIn {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
          .leaflet-container {
            height: 100%;
            width: 100%;
          }
          .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .glass-effect {
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .alert-gradient {
            background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
          }
          .success-gradient {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          }
          .sidebar-animation {
            animation: slideIn 0.3s ease-out;
          }
          .floating-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
          }
          .floating-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          }
          .card-hover {
            transition: all 0.3s ease;
          }
          .card-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          }
        `}</style>

        <div className="flex flex-col min-h-screen bg-gray-50">
          <Dialog>
            {/* Enhanced Header */}
            <header className="gradient-bg shadow-lg">
              <div className="flex flex-row items-center justify-between w-full p-4">
                <div className="flex items-center">
                  <div className="relative">
                    <Image
                      src="/college-logo.jpg"
                      width={60}
                      height={60}
                      alt="SREC Logo"
                      className="rounded-full border-2 border-white shadow-lg"
                    />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                  </div>
                  <div className="ml-4">
                    <h1 className="text-2xl font-bold text-white tracking-wide">SREC EV TRACKER</h1>
                    <p className="text-sm text-blue-100 opacity-90">Real-time Vehicle Monitoring</p>
                  </div>
                </div>
                
                {/* Status indicators */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-white text-sm font-medium">
                      {cars.size} Vehicle{cars.size !== 1 ? 's' : ''} Online
                    </span>
                  </div>
                  <button 
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="md:hidden bg-white/20 rounded-lg p-2 text-white hover:bg-white/30 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </header>

            <div className='flex flex-col flex-grow md:flex-row'>
              {/* Enhanced Sidebar */}
              <aside className={`${showSidebar ? 'block' : 'hidden'} md:block w-full md:w-80 bg-white border-r border-gray-200 shadow-lg sidebar-animation`}>
                <div className="p-6 space-y-6">
                  {/* Vehicle Status Cards */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Vehicle Status
                    </h2>
                    
                    {sortedCars.length > 0 ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto hide-scrollbar">
                        {sortedCars.map((car) => (
                          <div 
                            key={car.carId}
                            className={`p-4 rounded-xl cursor-pointer card-hover ${
                              sosMessages.has(car.carId) 
                                ? 'alert-gradient text-white shadow-lg' 
                                : 'bg-gradient-to-r from-green-50 to-blue-50 border border-green-200'
                            }`}
                            onClick={() => handleCarInfoClick(car.latitude, car.longitude)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  sosMessages.has(car.carId) ? 'bg-white/20' : 'bg-blue-100'
                                }`}>
                                  <svg className={`w-5 h-5 ${sosMessages.has(car.carId) ? 'text-white' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className={`font-semibold ${sosMessages.has(car.carId) ? 'text-white' : 'text-gray-800'}`}>
                                    EV {car.carId}
                                  </h3>
                                  <p className={`text-sm ${sosMessages.has(car.carId) ? 'text-white/80' : 'text-gray-600'}`}>
                                    {parseFloat(car.speed).toFixed(1)} km/h
                                  </p>
                                </div>
                              </div>
                              <div className={`text-right ${sosMessages.has(car.carId) ? 'text-white' : 'text-gray-600'}`}>
                                <p className="text-xs">Lat: {parseFloat(car.latitude).toFixed(4)}</p>
                                <p className="text-xs">Lng: {parseFloat(car.longitude).toFixed(4)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>No vehicles online</p>
                      </div>
                    )}
                  </div>
                  {/* Control Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={() => setFollowCars(!followCars)}
                      className={`w-full p-3 rounded-lg font-medium transition-all duration-200 ${
                        followCars 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {followCars ? 'Stop Following Vehicles' : 'Follow Vehicles'}
                    </button>
                    
                    <button
                      onClick={() => {
                        setMapCenter({ lat: 11.10223, lng: 76.9659 });
                        // setFollowCars(true);
                      }}
                      className="w-full p-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors duration-200"
                    >
                      Reset to Campus View
                    </button>
                  </div>

                  {/* Location Categories */}
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Campus Locations
                    </h2>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto hide-scrollbar">
                      {staticLocations.map((location) => (
                        <div
                          key={location.id}
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors duration-200"
                          onClick={() => handleCarInfoClick(location.lat, location.lng)}
                        >
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            location.category === 'dining' ? 'bg-orange-500' :
                            location.category === 'academic' ? 'bg-blue-500' :
                            location.category === 'administrative' ? 'bg-purple-500' :
                            'bg-cyan-500'
                          }`}></div>
                          <div>
                            <p className="font-medium text-gray-800">{location.name}</p>
                            <p className="text-xs text-gray-600">{location.category}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
              
              <main className="flex flex-col flex-grow min-h-[100%] relative">
                {/* Enhanced Alert System */}
                {sosMessages.size > 0 && (
                  <div 
                    onDoubleClick={handleSosAlertClick} 
                    className="alert-gradient text-white shadow-lg border-l-4 border-red-600 m-4 rounded-lg overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-center mb-3">
                        <svg className="w-6 h-6 mr-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <strong className="font-bold text-lg">🚨 EMERGENCY ALERTS</strong>
                      </div>
                      <div className="space-y-2">
                        {Array.from(sosMessages.entries()).map(([carId, message], index) => (
                          <div key={index} className="bg-white/20 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">EV {carId}</span>
                              <span className="text-sm opacity-90">{new Date().toLocaleTimeString()}</span>
                            </div>
                            <p className="mt-1">{message}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm mt-3 opacity-90">Double-click to dismiss alerts</p>
                    </div>
                  </div>
                )}

                {okMessages.size > 0 && (
                  <div 
                    onDoubleClick={handleSosAlertClick} 
                    className="success-gradient text-white shadow-lg border-l-4 border-green-600 m-4 rounded-lg overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-center mb-3">
                        <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <strong className="font-bold text-lg">✅ Status Updates</strong>
                      </div>
                      <div className="space-y-2">
                        {Array.from(okMessages.entries()).map(([carId, message], index) => (
                          <div key={index} className="bg-white/20 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">EV {carId}</span>
                              <span className="text-sm opacity-90">{new Date().toLocaleTimeString()}</span>
                            </div>
                            <p className="mt-1">{message}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm mt-3 opacity-90">Double-click to dismiss</p>
                    </div>
                  </div>
                )}

                {/* Enhanced Map Container */}
                {cars.size > 0 ? (
                  <div className="flex-grow relative">
                    <MapContainer
                      center={[mapCenter.lat, mapCenter.lng]}
                      zoom={19}
                      maxZoom={22}
                      style={{ height: '100%', width: '100%' }}
                      ref={mapRef}
                      attributionControl={false}
                      className="rounded-lg shadow-inner"
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution=""
                        maxZoom={22}
                      />
                      
                      <MapUpdater center={mapCenter} cars={cars} followCars={followCars} />
                      
                      {/* Enhanced Static Location Markers */}
                      {staticLocations.map((location) => (
                        <Marker
                          key={location.id}
                          position={[location.lat, location.lng]}
                          icon={location.icon}
                        >
                          <Tooltip 
                            direction="top" 
                            offset={[0, -10]} 
                            opacity={0.9} 
                            permanent={false}
                            className="custom-tooltip"
                          >
                            <div className="text-center">
                              <div className="font-semibold">{location.name}</div>
                              <div className="text-xs text-gray-600">{location.category}</div>
                            </div>
                          </Tooltip>

                          <Popup className="custom-popup">
                            <div className="p-3">
                              <div className="flex items-center mb-2">
                                <div className={`w-3 h-3 rounded-full mr-2 ${
                                  location.category === 'dining' ? 'bg-orange-500' :
                                  location.category === 'academic' ? 'bg-blue-500' :
                                  location.category === 'administrative' ? 'bg-purple-500' :
                                  'bg-cyan-500'
                                }`}></div>
                                <h3 className="font-bold text-lg text-gray-800">{location.name}</h3>
                              </div>
                              <p className="text-gray-600 mb-2">{location.description}</p>
                              <div className="text-sm text-gray-500">
                                <p><strong>Category:</strong> {location.category}</p>
                                <p><strong>Coordinates:</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}

                      {/* Enhanced Car Markers */}
                      {sortedCars.map((car) => (
                        <Marker
                          key={car.carId}
                          position={[car.latitude, car.longitude]}
                          icon={createCarIcon(sosMessages.has(car.carId))}
                        >    
                          <Tooltip 
                            direction="top" 
                            offset={[0, -15]} 
                            opacity={0.9} 
                            permanent={false}
                          >
                            <div className="text-center">
                              <div className="font-semibold">EV {car.carId}</div>
                              <div className="text-xs">{parseFloat(car.speed).toFixed(1)} km/h</div>
                            </div>
                          </Tooltip>


                          <Popup className="custom-popup">
                            <div className="p-3">
                              <div className="flex items-center mb-3">
                                <div className={`w-4 h-4 rounded-full mr-2 ${
                                  sosMessages.has(car.carId) ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                                }`}></div>
                                <h3 className="font-bold text-lg text-gray-800">EV {car.carId}</h3>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-blue-50 p-2 rounded">
                                  <p className="font-medium text-blue-800">Speed</p>
                                  <p className="text-blue-600">{parseFloat(car.speed).toFixed(1)} km/h</p>
                                </div>
                                <div className="bg-green-50 p-2 rounded">
                                  <p className="font-medium text-green-800">Status</p>
                                  <p className="text-green-600">
                                    {sosMessages.has(car.carId) ? 'Emergency' : 'Normal'}
                                  </p>
                                </div>
                                <div className="bg-purple-50 p-2 rounded">
                                  <p className="font-medium text-purple-800">Latitude</p>
                                  <p className="text-purple-600">{parseFloat(car.latitude).toFixed(6)}</p>
                                </div>
                                <div className="bg-orange-50 p-2 rounded">
                                  <p className="font-medium text-orange-800">Longitude</p>
                                  <p className="text-orange-600">{parseFloat(car.longitude).toFixed(6)}</p>
                                </div>
                              </div>
                              
                              <div className="mt-3 text-xs text-gray-500">
                                Last updated: {new Date().toLocaleTimeString()}
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                    
                    {/* Map Controls */}
                    <div className="absolute top-4 right-4 space-y-2 z-[1000]">
                      <button
                        onClick={() => setFollowCars(!followCars)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg ${
                          followCars 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {followCars ? '📍 Following' : '🔓 Free View'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className='flex items-center justify-center flex-grow bg-gray-50'>
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-600 mb-2">No Vehicles Online</h2>
                      <p className="text-gray-500">Waiting for vehicles to connect...</p>
                      <div className="mt-4 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </div>
                  </div>
                )}
              </main> 
            </div>
            
            {/* Floating Action Button for Mobile */}
            <button 
              className="floating-button md:hidden"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </Dialog>
        </div>
      </>
    );
  }

  export default DashBoard;