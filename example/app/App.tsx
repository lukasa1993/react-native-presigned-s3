import React, {useCallback} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import ListScreen from './screens/list';
import UploadScreen from './screens/upload';
import {PS3Provider, S3Client} from 'react-native-presigned-s3';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {create, get, list, remove} from './utils/files';
import AddButton from './componenets/addButton';
import type {S3Handlers} from 'react-native-presigned-s3';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 60000,
    },
  },
});

const handlers: S3Handlers = {
  get,
  list,
  create,
  remove,
};

const s3Client = new S3Client(handlers, {
  appGroup: 'com.example.ps3.test',
  directory: 'ps3_test',
  immediateDownload: false,
  localCache: false,
});

function App() {
  const listRightButton = useCallback(() => {
    return <AddButton />;
  }, []);

  return (
    <PS3Provider S3Client={s3Client}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen
                name="List"
                component={ListScreen}
                initialParams={{
                  path: 'home/',
                }}
                options={{
                  headerRight: listRightButton,
                }}
              />
              <Stack.Screen name="Upload" component={UploadScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>
    </PS3Provider>
  );
}

export default App;
