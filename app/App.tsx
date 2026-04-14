// App.tsx
import React, { useState } from 'react';
import AppNavigator from "./(main)/dashboard/BottomNavigation";
import SplashScreen from './SplashScreen';


const App = () => {
    const [splashDone, setSplashDone] = useState(false);

    if (!splashDone) {
        return <SplashScreen onFinish={() => setSplashDone(true)} />;
    }

    return <AppNavigator />;
};

export default App;