import * as MediaLibrary from 'expo-media-library';
import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useRef, useState} from 'react';
import {Animated, View, useWindowDimensions, } from 'react-native';
import {getUserBoxMedia} from '../utils/APICalls';
import {getStorageMedia} from '../utils/functions';
import {storagePermission} from '../utils/permissions';
import AllPhotos from './AllPhotos';
import PinchZoom from './PinchZoom';
import {sortCondition, MediaItem, } from '../types/interfaces';

interface Props {
  scrollAnim: Animated.Value;
  HEADER_HEIGHT: number;
  setHeaderShown: Function;
}

const PhotosContainer: React.FC<Props> = (props) => {
  const SCREEN_WIDTH = useWindowDimensions().width;
  const SCREEN_HEIGHT = useWindowDimensions().height;

  const initialPhotoNumber:number = 5000;
  const storiesHeight:number = 1.618*SCREEN_WIDTH/3;

  const [permission, setPermission] = useState<boolean>();
  const [photos, setPhotos] = useState<Array<MediaLibrary.Asset>>([]);
  const [mediaEndCursor, setMediaEndCursor] = useState<string>('');
  const [mediaHasNextPage, setMediaHasNextPage] = useState<boolean>(true);
  const [mediaTotalCount , setMediaTotalCount] = useState<number>(99999);
  const [storagePhotos, setStoragePhotos] = useState<
    Array<MediaLibrary.Asset>
  >([]);
  const navigation = useNavigation();

  let scale = useRef(new Animated.Value(1)).current;
  let baseScale2 = useRef(new Animated.Value(0)).current;
  const baseScale: Animated.AnimatedAddition = useRef(Animated.add(baseScale2, scale.interpolate({
    inputRange: [0, 1, 4],
    outputRange: [1, 0, -1],
  }))).current;

  const scrollIndicator = useRef(new Animated.Value(0)).current;
  const focalX = useRef(new Animated.Value(0)).current;
  const focalY = useRef(new Animated.Value(0)).current;
  const numberOfPointers = useRef(new Animated.Value(0)).current;
  const velocity = useRef(new Animated.Value(0)).current;

  const [pinchOrZoom, setPinchOrZoom] = useState<
    'pinch' | 'zoom' | undefined
  >();
  const [sortCondition_i, setSortCondition_i] = useState<sortCondition>('day');
  const [numColumns, setNumColumns] = useState<2 | 3 | 4>(2);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPinchAndZoom, setIsPinchAndZoom] = useState<boolean>(false);
  const [loadMore, setLoadMore] = useState<number>(0);

  //TODO: Change this function to the getPhotos in actions like in AllPhotos
  function getMedia(permission:boolean, photoNumber:number, hasNextPage:boolean=true, endCursor:string = ''){
    let totalCount = mediaTotalCount;
    if(hasNextPage){
      ////console.log('media fetch while');
      setLoading(true);
      getStorageMedia(permission, photoNumber, endCursor)?.then(
        (value) => {
          if(value){
            ////console.log('getStorageMedia');
            hasNextPage = value.hasNextPage;
            endCursor = value.endCursor;
            totalCount = value.totalCount;
            //setStoragePhotos(oldStoragePhotos => [...oldStoragePhotos,...value.assets]);
            setStoragePhotos(value.assets);
            setMediaEndCursor(endCursor);
            setMediaHasNextPage(hasNextPage);
            setMediaTotalCount(totalCount);
            getMedia(permission, photoNumber, hasNextPage, endCursor);
          }
          
        },
      ).catch(error => setLoading(false));
    }else{
      setLoading(false);
    }
  }
  useEffect(() => {
    if (permission) {
      navigation.navigate('HomePage');
      getMedia(permission, initialPhotoNumber);
    } else if(!permission) {
      navigation.navigate('PermissionError');
    }
  }, [permission]);

  useEffect(()=>{
    console.log([Date.now()+': component PhotosContainer rendered']);
  });
  useEffect(() => {
    console.log(['component PhotosContainer mounted']);
    storagePermission()
      .then((res) => setPermission(res))
      .catch((error) => {});
      return () => {console.log(['component PhotosContainer unmounted']);}
  }, []);

  useEffect(() => {
    let boxPhotos: Array<MediaLibrary.Asset> = getUserBoxMedia('');
    if (storagePhotos) {
      setPhotos([...boxPhotos, ...storagePhotos]);
    }
  }, [storagePhotos]);

  return photos ? (
    <View
      style={{
        flex: 1,
        flexDirection:'column',
        width: SCREEN_WIDTH,
        position: 'relative',
        zIndex:10
      }}
    >
          <PinchZoom
            setPinchOrZoom={setPinchOrZoom}
            pinchOrZoom={pinchOrZoom}
            scale={scale}
            baseScale={baseScale}
            baseScale2={baseScale2}
            setSortCondition={setSortCondition_i}
            setNumColumns={setNumColumns}
            sortCondition={sortCondition_i}
            numColumns={numColumns}
            focalX={focalX}
            focalY={focalY}
            numberOfPointers={numberOfPointers}
            velocity={velocity}
            setIsPinchAndZoom={setIsPinchAndZoom}
            isPinchAndZoom={isPinchAndZoom}
          >
            <AllPhotos
              pinchOrZoom={pinchOrZoom}
              scale={scale}
              baseScale={baseScale}
              photos={photos}
              sortCondition={sortCondition_i}
              numColumns={numColumns}
              loading={loading}
              focalX={focalX}
              focalY={focalY}
              numberOfPointers={numberOfPointers}
              velocity={velocity}
              isPinchAndZoom={isPinchAndZoom}
              setLoadMore={setLoadMore}
              storiesHeight={storiesHeight}
              scrollAnim={props.scrollAnim}
              HEADER_HEIGHT={props.HEADER_HEIGHT}
              setHeaderShown={props.setHeaderShown}
            />
          </PinchZoom>
    </View>
  ) : (
    <></>
  );
};

export default PhotosContainer;
