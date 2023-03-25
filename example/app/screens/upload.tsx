import React from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useMutation, useQuery} from '@tanstack/react-query';
import {
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import {nanoid} from 'nanoid/non-secure';
import {useList} from 'react-native-presigned-s3';
import {useNavigation, useRoute} from '@react-navigation/native';
import DocumentPicker from 'react-native-document-picker';

// @ts-ignore
import path from 'path-browserify';

export default function UploadScreen() {
  const navigation = useNavigation();
  const {params} = useRoute();

  // @ts-ignore
  const current_path = params!.path;
  const {addUpload} = useList(current_path);

  useQuery(['permissions'], async () => {
    let perms = {};
    if (Platform.OS !== 'ios') {
      try {
        perms = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        ]);
        console.log(perms);
      } catch (e) {
        console.error(e);
      }
    }

    return perms;
  });

  const upload = useMutation({
    mutationKey: ['upload'],
    mutationFn: async () => {
      const img = await ImagePicker.openPicker({
        mediaType: 'any',
      });
      // @ts-ignore
      const key = path.join(current_path, `${nanoid(5)}_${img.filename}`);

      addUpload(key, img.path, {
        payload: {a: 'b'},
        type: img.mime,
      });
      navigation.goBack();
    },
  });

  const docUpload = useMutation({
    mutationKey: ['upload'],
    mutationFn: async () => {
      const [doc] = await DocumentPicker.pick(
        Platform.OS === 'ios'
          ? {
              type: [DocumentPicker.types.allFiles],
            }
          : {
              type: [DocumentPicker.types.allFiles],
              copyTo: 'documentDirectory',
            },
      );

      // @ts-ignore
      const key = path.join(current_path, `${nanoid(5)}_${doc.name}`);

      addUpload(
        key,
        decodeURIComponent(doc.fileCopyUri || doc.uri).replace('file://', ''),
        {
          payload: {a: 'b2'},
          type: doc.type,
        },
      );
      navigation.goBack();
    },
  });

  return (
    <SafeAreaView
      style={{flex: 1, alignItems: 'center', justifyContent: 'flex-start'}}>
      <Text style={{marginBottom: 40}}>
        Uploading To Folder: {current_path}
      </Text>
      <TouchableOpacity
        style={styles.button}
        disabled={upload.isLoading || docUpload.isLoading}
        onPress={() => upload.mutateAsync()}>
        <Text style={styles.text}>Pick Image</Text>
      </TouchableOpacity>
      <View style={{height: 100}} />
      <TouchableOpacity
        style={styles.button}
        disabled={upload.isLoading || docUpload.isLoading}
        onPress={() => docUpload.mutateAsync()}>
        <Text style={styles.text}>Doc Image</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 4,
    elevation: 3,
    backgroundColor: 'black',
  },
  text: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: 'bold',
    letterSpacing: 0.25,
    color: 'white',
  },
});
