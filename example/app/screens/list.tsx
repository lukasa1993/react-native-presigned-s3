import {useRoute} from '@react-navigation/native';
import {FlatList, RefreshControl, Text, View} from 'react-native';
import FileRow from '../componenets/fileRow';
import {useList} from 'react-native-presigned-s3';
import {useMemo} from 'react';

export default function ListScreen() {
  const {params} = useRoute();
  // @ts-ignore
  const current_path = params!.path;
  const {files, downloads, uploads, reload, loading} = useList(current_path);

  const data = useMemo(
    () => [...files, ...downloads, ...uploads],
    [downloads, files, uploads],
  );

  return (
    <View
      style={{
        flex: 1,
      }}>
      <Text style={{padding: 20}}>{current_path}</Text>
      <FlatList
        style={{flexGrow: 1}}
        contentContainerStyle={{flexGrow: 1, paddingVertical: 20}}
        refreshControl={
          <RefreshControl
            tintColor={'black'}
            colors={['black']}
            refreshing={loading}
            onRefresh={reload}
          />
        }
        data={data}
        keyExtractor={item => item.key}
        renderItem={({item}) => (
          <FileRow
            name={item.key}
            meta={item.meta}
            url={item.url}
            progress={item.progress}
            type={item.type}
          />
        )}
      />
    </View>
  );
}
