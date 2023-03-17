import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, TouchableOpacity, Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import FileViewer from 'react-native-file-viewer';
import {prettyBytes} from '../utils/utils';
import {useList, useDownloader} from 'react-native-presigned-s3';

// @ts-ignore
import path from 'path-browserify';

export default function FileRow({
  name,
  type,
  meta,
  progress: _progress,
}: {
  name: string;
  type?: string;
  progress?: number;
  meta: any;
}) {
  const navigation = useNavigation();
  const {params} = useRoute();
  // @ts-ignore
  const current_path = params!.path;
  const fileKey = path.join(current_path, name);

  const {removeFile, downloads} = useList(current_path);
  const {localPath, addDownload} = useDownloader(fileKey);

  const [openAfterDownload, setOpenAfterDownload] = useState(false);

  const progress = useMemo(() => {
    if (`${downloads?.[0]?.key}`.endsWith(name)) {
      return downloads?.[0]?.progress || _progress || null;
    }
    return _progress || null;
  }, [downloads, name, _progress]);

  const onClick = useCallback(() => {
    if (meta?.isFolder) {
      // @ts-ignore
      return navigation.push('List', {
        // @ts-ignore
        path: `${meta?.path}`,
      });
    } else {
      if (localPath) {
        return FileViewer.open(localPath, {
          showOpenWithDialog: true,
        });
      } else {
        setOpenAfterDownload(true);
        return addDownload(fileKey);
      }
    }
  }, [addDownload, fileKey, localPath, meta?.isFolder, meta?.path, navigation]);

  useEffect(() => {
    if (openAfterDownload && localPath) {
      setOpenAfterDownload(false);
      FileViewer.open(localPath, {
        showOpenWithDialog: true,
      }).catch(e => console.error(e));
    }
  }, [localPath, openAfterDownload]);

  const onLong = useCallback(() => {
    Alert.alert(`Deleting ${name}?`, fileKey, [
      {
        text: 'I am Sure',
        onPress: () => removeFile(fileKey),
        style: 'destructive',
      },
      {
        text: 'Wopsy',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
    ]);
  }, [fileKey, name, removeFile]);

  return (
    <TouchableOpacity onPress={onClick} onLongPress={onLong}>
      <View
        style={{
          flex: 1,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            paddingHorizontal: 10,
            marginBottom: 8,
          }}>
          <Text style={{flex: 1}}>
            {meta?.isFolder ? '📁 ' : ''}
            {name}
          </Text>
          {!progress && (
            <Text>{meta?.isFolder ? '' : prettyBytes(meta?.size)}</Text>
          )}
          {!!progress && (
            <Text>
              {parseFloat(`${progress}`).toFixed(2)}%{' '}
              {type === 'uploading' ? '↑' : '↓'}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
