# react-native-presigned-s3

Handles S3 PreSigned Upload/Download for folders and single files provides hooks, needs backend to deliver PreSigned
post and get payloads can be mimicked in app as well but not recommended for access control. To check out expected
server responses please see [example/server](./example/server) and for simple demo app [example/app](./example/app)

## Setup
1. 
   1. ```yarn add react-native-presigned-s3 react-native-background-upload react-native-fs @react-native-async-storage/async-storage```
2. This Lib has peer-dependency on these 2 libs:
   1. [RNFS](https://github.com/itinance/react-native-fs)
   2. [Uploader](https://github.com/Vydia/react-native-background-upload)
   3. [AsyncStorage](https://github.com/react-native-async-storage/async-storage)
3. appGroup setup for [Uploader](https://github.com/Vydia/react-native-background-upload)  and corresponding [Apple doc](https://developer.apple.com/documentation/foundation/nsfilemanager/1412643-containerurlforsecurityapplicati)
4. RNFS setup for background downloads [RNFS Doc](https://github.com/itinance/react-native-fs#background-downloads-tutorial-ios)

## Usage

1. First need to define S3Client and Wrap your tree with PS3Provider

    ```jsx
    const s3Client = new S3Client(handlers, {
      appGroup: 'com.example.ps3.test', // appGroup of app for background upload support https://developer.apple.com/documentation/foundation/nsfilemanager/1412643-containerurlforsecurityapplicati
      directory: 'ps3_test', // folder under RNFS.CachesDirectoryPath for local storage
      immediateDownload: true,
      localCache: false,
      persistKey: '@example_ps3_storage_key', // async storage key for presistency
      retries: 5,
    });
    ```

    ```jsx
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
    ```

2. To list files under `prefix`
    ```jsx
    const {files, loading, reload} = useList(prefix);
    ```
3. To monitor single file and manipulate it
   ```jsx
   const {removeFile, files, addDownload} = useList(key, {
   progress: true,
   });
   ```
   Here we will get single file (assuming key provided is exact and not prefix) and will be updated if its downloaded or
   uploaded
4. To upload single file under given folder (prefix)
   ```jsx
    const {addUpload} = useList(current_path); 
   ```
   ```jsx
    addUpload(key, img.path, {
        payload: {a: 'b'}, // meta data stored in s3
        type: img.mime,
      }); 
   ````
   as seen in [example/app](./example/app) this will trigger ```usseList(prefix)``` and will also be monitored
   in ```seList(key)``` and we get realtime upload progress  
