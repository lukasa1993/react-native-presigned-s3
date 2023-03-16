import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {NavigationContainer} from '@react-navigation/native';
import HomeScreen from './screens/home';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import ListScreen from './screens/list';
import UploadScreen from './screens/upload';
import {PS3Provider, S3Handlers, S3Client} from 'react-native-presigned-s3';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {create, get, list, remove} from './utils/files';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

const handlers: S3Handlers = {
  get,
  list,
  create,
  remove,
};
const s3Client = new S3Client(handlers);

function App() {
  return (
    <PS3Provider S3Client={s3Client}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="List" component={ListScreen} />
              <Stack.Screen name="Upload" component={UploadScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>
    </PS3Provider>
  );
}

export default App;
