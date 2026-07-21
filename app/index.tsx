import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SessionManager } from '../utils/sessionManager';

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const status = await SessionManager.getIsLoggedIn();
      const userType = await SessionManager.getUserType();
      setIsLoggedIn(status);
      setUserType(userType);
    };
    checkSession();
  }, []);

  if (isLoggedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }



  // const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // useEffect(() => {
  //   SessionManager.getIsLoggedIn().then(setIsLoggedIn);
  // }, []);


  // if (!isLoggedIn || isLoggedIn === null) {
  //   return <Redirect href="/(auth)/login" />;
  // }

  return isLoggedIn ? userType === "store_manager" ? <Redirect href="/(main)/store_management/store" /> : <Redirect href="/(main)/dashboard" /> : <Redirect href="/(auth)/login" />;
}