import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Phone, User, CreditCard, Package, Star, ChevronRight, Menu as MenuIcon, X, Check, ArrowLeft, Plus, Minus, Bell, Settings, LogOut, Users, BarChart3, Truck } from 'lucide-react';

// Mock API Client (Fake Data)
const fakeApiClient = {
  // Auth
  signUp: async (phone) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, message: 'OTP sent to ' + phone };
  },
  
  verifyOTP: async (phone, otp) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (otp === '123456') {
      return { 
        success: true, 
        user: { id: '1', phone, name: null },
        token: 'fake-jwt-token'
      };
    }
    return { success: false, message: 'Invalid OTP' };
  },

  // Profile
  updateProfile: async (userData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, user: { id: '1', ...userData } };
  },

  // Menu
  getMenu: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const today = new Date();
    const menus = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      menus.push({
        id: `menu-${i}`,
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-IN', { weekday: 'long' }),
        meals: [
          {
            id: `veg-${i}`,
            type: 'Veg',
            name: i === 0 ? 'Sambar Rice + Rasam + Papad' : 
                  i === 1 ? 'Curd Rice + Pickle + Vadaam' :
                  i === 2 ? 'Lemon Rice + Dal + Appalam' :
                  'Variety Rice + Curry + Pickle',
            price: 60,
            image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=300&h=200&fit=crop',
            available: true
          },
          {
            id: `nonveg-${i}`,
            type: 'Non-Veg',
            name: i === 0 ? 'Chicken Biryani + Raita + Pickle' :
                  i === 1 ? 'Mutton Curry Rice + Appalam' :
                  i === 2 ? 'Fish Curry Rice + Papad' :
                  'Egg Curry Rice + Pickle',
            price: 70,
            image: 'https://images.unsplash.com/photo-1563379091339-03246963d7d3?w=300&h=200&fit=crop',
            available: true
          },
          {
            id: `special-${i}`,
            type: 'Special',
            name: i === 0 ? 'Paneer Butter Masala Rice' :
                  i === 1 ? 'Mushroom Biryani Special' :
                  'Chef Special Combo',
            price: 65,
            image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=300&h=200&fit=crop',
            available: i < 3
          }
        ]
      });
    }
    
    return { success: true, menus };
  },

  // Orders
  createOrder: async (orderData) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      success: true,
      order: {
        id: 'ORD' + Date.now(),
        ...orderData,
        status: 'confirmed',
        trackingSteps: [
          { step: 'confirmed', time: new Date().toISOString(), completed: true },
          { step: 'cooking', time: null, completed: false },
          { step: 'out_for_delivery', time: null, completed: false },
          { step: 'delivered', time: null, completed: false }
        ]
      }
    };
  },

  getMyOrders: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const today = new Date();
    return {
      success: true,
      orders: [
        {
          id: 'ORD001',
          date: today.toISOString().split('T')[0],
          meal: { name: 'Sambar Rice + Rasam + Papad', type: 'Veg' },
          status: 'cooking',
          price: 60,
          deliveryTime: '12:30 PM - 2:30 PM'
        }
      ]
    };
  },

  // Subscriptions
  createSubscription: async (subData) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      success: true,
      subscription: {
        id: 'SUB' + Date.now(),
        ...subData,
        status: 'active',
        remainingMeals: subData.totalMeals
      }
    };
  },

  // Admin
  getAdminStats: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      stats: {
        todayOrders: 45,
        vegCount: 18,
        nonVegCount: 22,
        specialCount: 5,
        revenue: 2970,
        deliveryAgents: [
          { name: 'Ravi', orders: 12, status: 'delivering' },
          { name: 'Kumar', orders: 15, status: 'available' },
          { name: 'Suresh', orders: 18, status: 'delivering' }
        ]
      }
    };
  }
};

// Real Supabase Client (placeholder)
const realSupabaseClient = {
  // This would contain actual Supabase integration
  ...fakeApiClient // For now, fallback to fake data
};

// Environment-aware API client
const useApiClient = () => {
  const useFakeApi = process.env.NEXT_PUBLIC_USE_FAKE_API !== 'false';
  return useFakeApi ? fakeApiClient : realSupabaseClient;
};

// Main App Component
const LunchhouseApp = () => {
  const [currentView, setCurrentView] = useState('home');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [orderData, setOrderData] = useState(null);
  
  const apiClient = useApiClient();

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Navigation
  const navigateTo = (view, data = null) => {
    setCurrentView(view);
    setOrderData(data);
    setIsMenuOpen(false);
  };

  // Auth state management
  useEffect(() => {
    const savedUser = localStorage.getItem('lunchhouse_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const saveUser = (userData) => {
    setUser(userData);
    localStorage.setItem('lunchhouse_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lunchhouse_user');
    setCurrentView('home');
    showNotification('Logged out successfully');
  };

  // Components
  const Notification = () => {
    if (!notification) return null;
    
    return (
      <div className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
        notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
      } text-white`}>
        {notification.message}
      </div>
    );
  };

  const Header = ({ title, showBack = false, showMenu = false }) => (
    <div className="bg-orange-500 text-white p-4 flex items-center justify-between">
      {showBack ? (
        <button onClick={() => setCurrentView('dashboard')} className="p-1">
          <ArrowLeft size={24} />
        </button>
      ) : (
        <div className="w-8" />
      )}
      
      <h1 className="text-xl font-bold">{title}</h1>
      
      {showMenu && user ? (
        <button onClick={() => setIsMenuOpen(true)} className="p-1">
          <MenuIcon size={24} />
        </button>
      ) : (
        <div className="w-8" />
      )}
    </div>
  );

  const SideMenu = () => (
    <div className={`fixed inset-0 z-50 ${isMenuOpen ? 'block' : 'hidden'}`}>
      <div className="absolute inset-0 bg-black opacity-50" onClick={() => setIsMenuOpen(false)} />
      <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Menu</h3>
          <button onClick={() => setIsMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="border-b pb-4">
            <p className="font-medium">{user?.name || 'User'}</p>
            <p className="text-sm text-gray-600">{user?.phone}</p>
          </div>
          
          <button 
            onClick={() => navigateTo('dashboard')}
            className="w-full text-left p-3 rounded-lg hover:bg-gray-50 flex items-center space-x-3"
          >
            <Package size={20} />
            <span>My Orders</span>
          </button>
          
          <button 
            onClick={() => navigateTo('profile')}
            className="w-full text-left p-3 rounded-lg hover:bg-gray-50 flex items-center space-x-3"
          >
            <User size={20} />
            <span>Profile</span>
          </button>
          
          {user?.role === 'admin' && (
            <button 
              onClick={() => navigateTo('admin')}
              className="w-full text-left p-3 rounded-lg hover:bg-gray-50 flex items-center space-x-3"
            >
              <BarChart3 size={20} />
              <span>Admin Dashboard</span>
            </button>
          )}
          
          <button 
            onClick={logout}
            className="w-full text-left p-3 rounded-lg hover:bg-gray-50 flex items-center space-x-3 text-red-600"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );

  // View Components
  const HomePage = () => (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
        <div className="p-6 text-center">
          <h1 className="text-3xl font-bold mb-2">🍛 Lunchhouse</h1>
          <p className="text-lg mb-6">Hot lunch to your office. Mon–Fri.</p>
          
          <div className="space-y-3">
            {user ? (
              <>
                <button 
                  onClick={() => navigateTo('menu')}
                  className="w-full bg-white text-orange-500 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Order Now
                </button>
                <button 
                  onClick={() => navigateTo('dashboard')}
                  className="w-full border-2 border-white text-white py-3 px-6 rounded-lg font-semibold hover:bg-white hover:text-orange-500 transition-colors"
                >
                  My Dashboard
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => navigateTo('signup')}
                  className="w-full bg-white text-orange-500 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Get Started
                </button>
                <button 
                  onClick={() => navigateTo('menu')}
                  className="w-full border-2 border-white text-white py-3 px-6 rounded-lg font-semibold hover:bg-white hover:text-orange-500 transition-colors"
                >
                  View Menu
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="p-6">
        <h2 className="text-2xl font-bold text-center mb-6">How It Works</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-xl">📱</span>
            </div>
            <div>
              <h3 className="font-semibold">Select</h3>
              <p className="text-gray-600">Choose your meal from our daily menu</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🍽️</span>
            </div>
            <div>
              <h3 className="font-semibold">Eat</h3>
              <p className="text-gray-600">Fresh lunch delivered to your office</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🔄</span>
            </div>
            <div>
              <h3 className="font-semibold">Repeat</h3>
              <p className="text-gray-600">Subscribe and never worry about lunch</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="p-6 bg-white">
        <h2 className="text-2xl font-bold text-center mb-6">Why Choose Lunchhouse?</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock size={24} className="text-green-600" />
            </div>
            <h3 className="font-semibold">On Time</h3>
            <p className="text-sm text-gray-600">12:30-2:30 PM</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Package size={24} className="text-blue-600" />
            </div>
            <h3 className="font-semibold">Fresh</h3>
            <p className="text-sm text-gray-600">Made daily</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CreditCard size={24} className="text-purple-600" />
            </div>
            <h3 className="font-semibold">Affordable</h3>
            <p className="text-sm text-gray-600">₹60-₹70</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <MapPin size={24} className="text-red-600" />
            </div>
            <h3 className="font-semibold">Convenient</h3>
            <p className="text-sm text-gray-600">To your desk</p>
          </div>
        </div>
      </div>
    </div>
  );

  const SignUpPage = () => {
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('phone'); // phone, otp, profile
    const [profileData, setProfileData] = useState({
      name: '',
      office_address: '',
      floor: ''
    });

    const handleSendOTP = async () => {
      if (!phone || phone.length !== 10) {
        showNotification('Please enter valid phone number', 'error');
        return;
      }
      
      setLoading(true);
      try {
        const result = await apiClient.signUp(phone);
        if (result.success) {
          setStep('otp');
          showNotification('OTP sent to your phone');
        }
      } catch (error) {
        showNotification('Failed to send OTP', 'error');
      }
      setLoading(false);
    };

    const handleVerifyOTP = async () => {
      if (!otp || otp.length !== 6) {
        showNotification('Please enter valid OTP', 'error');
        return;
      }
      
      setLoading(true);
      try {
        const result = await apiClient.verifyOTP(phone, otp);
        if (result.success) {
          if (result.user.name) {
            saveUser(result.user);
            navigateTo('dashboard');
          } else {
            setStep('profile');
          }
        } else {
          showNotification(result.message, 'error');
        }
      } catch (error) {
        showNotification('Invalid OTP', 'error');
      }
      setLoading(false);
    };

    const handleCompleteProfile = async () => {
      if (!profileData.name || !profileData.office_address) {
        showNotification('Please fill all required fields', 'error');
        return;
      }
      
      setLoading(true);
      try {
        const result = await apiClient.updateProfile({ phone, ...profileData });
        if (result.success) {
          saveUser(result.user);
          navigateTo('dashboard');
          showNotification('Welcome to Lunchhouse!');
        }
      } catch (error) {
        showNotification('Failed to save profile', 'error');
      }
      setLoading(false);
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Sign Up" showBack={true} />
        
        <div className="p-6">
          {step === 'phone' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Enter Your Phone</h2>
                <p className="text-gray-600">We'll send you an OTP to verify</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit phone number"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Enter OTP</h2>
                <p className="text-gray-600">Sent to +91 {phone}</p>
                <p className="text-sm text-gray-500 mt-2">(Demo: Use 123456)</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-2xl"
                  />
                </div>
                
                <button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                
                <button
                  onClick={() => setStep('phone')}
                  className="w-full text-orange-500 py-2 font-medium"
                >
                  Change Phone Number
                </button>
              </div>
            </div>
          )}

          {step === 'profile' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Complete Profile</h2>
                <p className="text-gray-600">Help us serve you better</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                    placeholder="Enter your full name"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Office Address *</label>
                  <textarea
                    value={profileData.office_address}
                    onChange={(e) => setProfileData({...profileData, office_address: e.target.value})}
                    placeholder="Enter your office address"
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Floor/Desk</label>
                  <input
                    type="text"
                    value={profileData.floor}
                    onChange={(e) => setProfileData({...profileData, floor: e.target.value})}
                    placeholder="e.g., 3rd Floor, Desk 15"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <button
                  onClick={handleCompleteProfile}
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const MenuPage = () => {
    const [menus, setMenus] = useState([]);
    const [selectedMeal, setSelectedMeal] = useState(null);

    useEffect(() => {
      const loadMenu = async () => {
        setLoading(true);
        try {
          const result = await apiClient.getMenu();
          if (result.success) {
            setMenus(result.menus);
          }
        } catch (error) {
          showNotification('Failed to load menu', 'error');
        }
        setLoading(false);
      };
      
      loadMenu();
    }, []);

    const handleOrderNow = (meal, date) => {
      if (!user) {
        navigateTo('signup');
        return;
      }
      
      navigateTo('order', { meal, date, type: 'single' });
    };

    const handleSubscribe = (meal) => {
      if (!user) {
        navigateTo('signup');
        return;
      }
      
      navigateTo('order', { meal, type: 'subscription' });
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Menu" showBack={true} showMenu={!!user} />
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2">Loading menu...</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {menus.map((menu) => (
              <div key={menu.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-lg">{menu.dayName}</h3>
                  <p className="text-sm text-gray-600">{new Date(menu.date).toLocaleDateString('en-IN')}</p>
                </div>
                
                <div className="space-y-4 p-4">
                  {menu.meals.map((meal) => (
                    <div key={meal.id} className={`border rounded-lg p-4 ${!meal.available ? 'opacity-50' : ''}`}>
                      <div className="flex space-x-4">
                        <img 
                          src={meal.image} 
                          alt={meal.name}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              meal.type === 'Veg' ? 'bg-green-100 text-green-800' :
                              meal.type === 'Non-Veg' ? 'bg-red-100 text-red-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {meal.type}
                            </span>
                          </div>
                          
                          <h4 className="font-medium mb-1">{meal.name}</h4>
                          <p className="text-lg font-bold text-orange-500">₹{meal.price}</p>
                          
                          {meal.available ? (
                            <div className="flex space-x-2 mt-3">
                              {menu.id === 'menu-0' && (
                                <button
                                  onClick={() => handleOrderNow(meal, menu.date)}
                                  className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-orange-600"
                                >
                                  Order Today
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleSubscribe(meal)}
                                className="flex-1 border border-orange-500 text-orange-500 py-2 px-4 rounded-lg text-sm font-medium hover:bg-orange-50"
                              >
                                Subscribe
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 mt-2">Not available</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const OrderPage = () => {
    const [orderType, setOrderType] = useState(orderData?.type || 'single');
    const [subscriptionPlan, setSubscriptionPlan] = useState('5');
    const [paymentMethod, setPaymentMethod] = useState('upi');

    const meal = orderData?.meal;
    const date = orderData?.date;

    if (!meal) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Header title="Order" showBack={true} />
          <div className="p-6 text-center">
            <p>No meal selected</p>
          </div>
        </div>
      );
    }

    const subscriptionPlans = {
      '5': { days: 5, price: meal.price * 5, discount: 0, label: '5 Days' },
      '20': { days: 20, price: meal.price * 20 * 0.95, discount: 5, label: '20 Days (5% off)' },
      '30': { days: 30, price: meal.price * 30 * 0.9, discount: 10, label: '30 Days (10% off)' }
    };

    const currentPlan = subscriptionPlans[subscriptionPlan];
    const totalPrice = orderType === 'single' ? meal.price : currentPlan.price;

    const handlePlaceOrder = async () => {
      setLoading(true);
      try {
        const orderPayload = {
          meal_id: meal.id,
          meal_name: meal.name,
          meal_type: meal.type,
          order_type: orderType,
          price: totalPrice,
          delivery_date: date,
          payment_method: paymentMethod,
          user_id: user.id,
          ...(orderType === 'subscription' && {
            subscription_days: currentPlan.days,
            total_meals: currentPlan.days
          })
        };

        const result = orderType === 'subscription' 
          ? await apiClient.createSubscription(orderPayload)
          : await apiClient.createOrder(orderPayload);

        if (result.success) {
          showNotification('Order placed successfully!');
          navigateTo('tracking', result.order || result.subscription);
        }
      } catch (error) {
        showNotification('Failed to place order', 'error');
      }
      setLoading(false);
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Place Order" showBack={true} />
        
        <div className="p-4 space-y-6">
          {/* Meal Summary */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex space-x-4">
              <img 
                src={meal.image} 
                alt={meal.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  meal.type === 'Veg' ? 'bg-green-100 text-green-800' :
                  meal.type === 'Non-Veg' ? 'bg-red-100 text-red-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {meal.type}
                </span>
                <h3 className="font-semibold mt-2">{meal.name}</h3>
                <p className="text-orange-500 font-bold">₹{meal.price} per meal</p>
              </div>
            </div>
          </div>

          {/* Order Type */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold mb-4">Order Type</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="orderType"
                  value="single"
                  checked={orderType === 'single'}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-4 h-4 text-orange-500"
                />
                <div className="flex-1">
                  <p className="font-medium">Today's Meal</p>
                  <p className="text-sm text-gray-600">Order for {date ? new Date(date).toLocaleDateString('en-IN') : 'today'}</p>
                </div>
                <p className="font-bold">₹{meal.price}</p>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="orderType"
                  value="subscription"
                  checked={orderType === 'subscription'}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-4 h-4 text-orange-500"
                />
                <div className="flex-1">
                  <p className="font-medium">Subscription</p>
                  <p className="text-sm text-gray-600">Save money with bulk orders</p>
                </div>
                <p className="font-bold">Save up to 10%</p>
              </label>
            </div>
          </div>

          {/* Subscription Plans */}
          {orderType === 'subscription' && (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold mb-4">Choose Plan</h3>
              <div className="space-y-3">
                {Object.entries(subscriptionPlans).map(([key, plan]) => (
                  <label key={key} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="subscriptionPlan"
                      value={key}
                      checked={subscriptionPlan === key}
                      onChange={(e) => setSubscriptionPlan(e.target.value)}
                      className="w-4 h-4 text-orange-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{plan.label}</p>
                      <p className="text-sm text-gray-600">{plan.days} meals</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₹{Math.round(plan.price)}</p>
                      {plan.discount > 0 && (
                        <p className="text-sm text-green-600">Save {plan.discount}%</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold mb-4">Payment Method</h3>
            <div className="space-y-3">
              {[
                { id: 'upi', label: 'UPI', icon: '📱' },
                { id: 'card', label: 'Credit/Debit Card', icon: '💳' },
                { id: 'netbanking', label: 'Net Banking', icon: '🏦' },
                { id: 'wallet', label: 'Digital Wallet', icon: '💰' }
              ].map((method) => (
                <label key={method.id} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-orange-500"
                  />
                  <span className="text-xl">{method.icon}</span>
                  <span className="font-medium">{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total Amount</span>
              <span className="text-orange-500">₹{Math.round(totalPrice)}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Including all taxes</p>
          </div>

          {/* Place Order Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="w-full bg-orange-500 text-white py-4 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? 'Placing Order...' : `Pay ₹${Math.round(totalPrice)}`}
          </button>
        </div>
      </div>
    );
  };

  const TrackingPage = () => {
    const order = orderData;
    
    if (!order) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Header title="Order Tracking" showBack={true} />
          <div className="p-6 text-center">
            <p>No order to track</p>
          </div>
        </div>
      );
    }

    const trackingSteps = [
      { id: 'confirmed', label: 'Order Confirmed', icon: '✅' },
      { id: 'cooking', label: 'Cooking', icon: '👨‍🍳' },
      { id: 'out_for_delivery', label: 'Out for Delivery', icon: '🚴' },
      { id: 'delivered', label: 'Delivered', icon: '🎉' }
    ];

    const currentStepIndex = trackingSteps.findIndex(step => 
      order.trackingSteps?.find(ts => ts.step === step.id && ts.completed)
    );

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Order Tracking" showBack={true} />
        
        <div className="p-4 space-y-6">
          {/* Order Info */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold">Order #{order.id}</h2>
              <p className="text-gray-600">Estimated delivery: 12:30 PM - 2:30 PM</p>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">{order.meal_name || order.meal?.name}</h3>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Quantity: 1</span>
                <span>₹{order.price}</span>
              </div>
            </div>
          </div>

          {/* Tracking Steps */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold mb-4">Tracking Status</h3>
            <div className="space-y-4">
              {trackingSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex + 1;
                
                return (
                  <div key={step.id} className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-green-100' : 
                      isCurrent ? 'bg-orange-100' : 'bg-gray-100'
                    }`}>
                      <span className="text-lg">{step.icon}</span>
                    </div>
                    
                    <div className="flex-1">
                      <h4 className={`font-medium ${
                        isCompleted ? 'text-green-600' :
                        isCurrent ? 'text-orange-600' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </h4>
                      {isCompleted && (
                        <p className="text-sm text-gray-500">
                          {new Date().toLocaleTimeString('en-IN', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      )}
                    </div>
                    
                    {isCompleted && (
                      <Check size={20} className="text-green-600" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* QR Code for Delivery */}
          <div className="bg-white rounded-lg p-4 shadow-sm text-center">
            <h3 className="font-semibold mb-4">Delivery QR Code</h3>
            <div className="w-32 h-32 bg-gray-200 rounded-lg mx-auto flex items-center justify-center mb-4">
              <span className="text-4xl">📱</span>
            </div>
            <p className="text-sm text-gray-600">
              Show this QR code to the delivery person
            </p>
          </div>

          {/* Contact Support */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold mb-3">Need Help?</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center space-x-3">
                <Phone size={20} className="text-orange-500" />
                <span>Call Support</span>
              </button>
              
              <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center space-x-3">
                <Bell size={20} className="text-orange-500" />
                <span>Track via SMS</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DashboardPage = () => {
    const [activeTab, setActiveTab] = useState('orders');
    const [orders, setOrders] = useState([]);
    const [subscription, setSubscription] = useState(null);

    useEffect(() => {
      const loadData = async () => {
        setLoading(true);
        try {
          const result = await apiClient.getMyOrders();
          if (result.success) {
            setOrders(result.orders);
          }
        } catch (error) {
          showNotification('Failed to load orders', 'error');
        }
        setLoading(false);
      };
      
      loadData();
    }, []);

    const handleFeedback = (orderId, rating) => {
      showNotification(`Thank you for your ${rating === 'up' ? 'positive' : ''} feedback!`);
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="My Dashboard" showMenu={true} />
        
        {/* Quick Stats */}
        <div className="p-4 bg-white border-b">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">12</p>
              <p className="text-sm text-gray-600">Meals Ordered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">₹720</p>
              <p className="text-sm text-gray-600">Total Spent</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b">
          <div className="flex">
            {[
              { id: 'orders', label: 'Orders', icon: Package },
              { id: 'subscription', label: 'Subscription', icon: Calendar }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-4 px-4 ${
                  activeTab === tab.id 
                    ? 'border-b-2 border-orange-500 text-orange-500' 
                    : 'text-gray-600'
                }`}
              >
                <tab.icon size={20} />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">No orders yet</p>
                  <button
                    onClick={() => navigateTo('menu')}
                    className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    Order Now
                  </button>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Order #{order.id}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'cooking' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p><strong>Meal:</strong> {order.meal.name}</p>
                      <p><strong>Date:</strong> {new Date(order.date).toLocaleDateString('en-IN')}</p>
                      <p><strong>Time:</strong> {order.deliveryTime}</p>
                      <p><strong>Amount:</strong> ₹{order.price}</p>
                    </div>
                    
                    <div className="flex space-x-2">
                      {order.status === 'delivered' && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">Rate your meal:</span>
                          <button 
                            onClick={() => handleFeedback(order.id, 'up')}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            👍
                          </button>
                          <button 
                            onClick={() => handleFeedback(order.id, 'down')}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            👎
                          </button>
                        </div>
                      )}
                      
                      {order.status !== 'delivered' && (
                        <button
                          onClick={() => navigateTo('tracking', order)}
                          className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600"
                        >
                          Track Order
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-4">
              {subscription ? (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Active Subscription</h3>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      ACTIVE
                    </span>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Plan:</span>
                      <span className="font-medium">30 Days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining Meals:</span>
                      <span className="font-medium text-orange-500">23/30</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next Delivery:</span>
                      <span className="font-medium">Tomorrow, 1:00 PM</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium">
                      Skip Tomorrow's Meal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">No active subscription</p>
                  <button
                    onClick={() => navigateTo('menu')}
                    className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    Subscribe Now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
      const loadStats = async () => {
        setLoading(true);
        try {
          const result = await apiClient.getAdminStats();
          if (result.success) {
            setStats(result.stats);
          }
        } catch (error) {
          showNotification('Failed to load stats', 'error');
        }
        setLoading(false);
      };
      
      loadStats();
    }, []);

    if (!stats && !loading) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Header title="Admin Dashboard" showBack={true} />
          <div className="p-6 text-center">
            <p>Access denied</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Admin Dashboard" showBack={true} />
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2">Loading stats...</p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-blue-500">{stats.todayOrders}</p>
                <p className="text-sm text-gray-600">Today's Orders</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-green-500">₹{stats.revenue}</p>
                <p className="text-sm text-gray-600">Today's Revenue</p>
              </div>
            </div>

            {/* Meal Breakdown */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold mb-4">Meal Breakdown</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Veg Meals</span>
                  </div>
                  <span className="font-bold">{stats.vegCount}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Non-Veg Meals</span>
                  </div>
                  <span className="font-bold">{stats.nonVegCount}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span>Special Meals</span>
                  </div>
                  <span className="font-bold">{stats.specialCount}</span>
                </div>
              </div>
            </div>

            {/* Delivery Agents */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold mb-4">Delivery Agents</h3>
              <div className="space-y-3">
                {stats.deliveryAgents.map((agent, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-sm text-gray-600">{agent.orders} orders</p>
                      </div>
                    </div>
                    
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      agent.status === 'available' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {agent.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-3 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                  <BarChart3 size={20} className="mx-auto mb-1" />
                  View Reports
                </button>
                
                <button className="p-3 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100">
                  <Users size={20} className="mx-auto mb-1" />
                  Manage Users
                </button>
                
                <button className="p-3 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100">
                  <Package size={20} className="mx-auto mb-1" />
                  Kitchen Orders
                </button>
                
                <button className="p-3 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100">
                  <Truck size={20} className="mx-auto mb-1" />
                  Delivery Routes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <HomePage />;
      case 'signup':
        return <SignUpPage />;
      case 'menu':
        return <MenuPage />;
      case 'order':
        return <OrderPage />;
      case 'tracking':
        return <TrackingPage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <Notification />
      <SideMenu />
      {renderCurrentView()}
    </div>
  );
};

export default LunchhouseApp;