import {
  createStyles,
  FormControl,
  ListSubheader,
  makeStyles,
  MenuItem,
  TextField,
  Typography,
} from '@material-ui/core';
import { ReactElement } from 'react';
import { menuList } from 'components/MapView/LeftPanel/utils';
import { LayerKey, LayerType } from 'config/types';
import { getDisplayBoundaryLayers, LayerDefinitions } from 'config/utils';
import { useSafeTranslation } from 'i18n';
import { appConfig } from 'config';
import { getLayerGeometryIcon } from './layer-utils';

const { multiCountry } = appConfig;

const useStyles = makeStyles(() =>
  createStyles({
    selectRoot: {
      width: '100%',
      '& .MuiInputBase-root': {
        '&:hover fieldset': {
          borderColor: '#333333',
        },
      },
    },
    input: {
      color: '#333333',
    },
    focused: {
      borderColor: '#333333',
      color: '#333333',
    },
    label: {
      color: '#333333',
    },
  }),
);

function LayerDropdown({
  type,
  value,
  setValue,
  label,
  placeholder,
  disabled = false,
  ...rest
}: LayerSelectorProps) {
  // this could be testable, needs to be constructed in a way that prevents it breaking whenever new layers are added. (don't put layer name in snapshot)

  const { t } = useSafeTranslation();
  const classes = useStyles();
  // Filter out layers that are not supported by the analysis tool
  const filterLayersForAnalysis = (layer: LayerType) => {
    if (layer.disableAnalysis) {
      return false;
    }
    if (layer.type === 'wms') {
      // Only raster and polygon layers are supported at the moment.
      // linestring and point geometries are not supported.
      return [undefined, 'polygon'].includes(layer.geometry);
    }
    return true;
  };

  // Only take first boundary for now
  const adminBoundaries = getDisplayBoundaryLayers();
  const AdminBoundaryCategory = {
    title: 'Admin Levels',
    layers: adminBoundaries
      .map((aboundary, _index) => ({
        title: t(
          `Level ${aboundary.adminLevelCodes.length - (multiCountry ? 1 : 0)}`,
        ),
        boundary: aboundary.id,
        ...aboundary,
      }))
      .filter(filterLayersForAnalysis),
    tables: [],
  };

  const categories = [
    // If type is admin_level_data, add admin boundaries at the begining to run analysis
    ...(type === 'admin_level_data' ? [AdminBoundaryCategory] : []),
    ...menuList // we could memo this but it isn't impacting performance, for now
      // 1. flatten to just the layer categories, don't need the big menus
      .flatMap(menu => menu.layersCategories)
      // 2. breakdown grouped layer back into flat list of layers if activate_all = false
      .map(layerCategory => {
        if (layerCategory.layers.some(f => f.group)) {
          const layers = layerCategory.layers.map(layer => {
            if (layer.group && !layer.group.activateAll) {
              return layer.group.layers.map(
                layerKey => LayerDefinitions[layerKey.id as LayerKey],
              );
            }
            return layer;
          });
          return {
            title: layerCategory.title,
            layers: layers.flat(),
            tables: layerCategory.tables,
          };
        }
        return layerCategory;
      })
      // 3. filter layers based on layer properties
      .map(category => ({
        ...category,
        layers: category.layers
          .filter(layer => layer.type === type)
          // if the layer is an admin level data layer, filter out the layers that have dates as there is
          // a bug when running an analysis. See https://github.com/WFP-VAM/prism-app/issues/1521
          .filter(layer => type !== 'admin_level_data' || !('dates' in layer))
          .filter(filterLayersForAnalysis),
      }))
      // 4. filter categories which don't have any layers at the end of it all.
      .filter(category => category.layers.length > 0),
  ];

  const defaultValue = 'placeholder';

  return (
    <FormControl {...rest}>
      <TextField
        classes={{ root: classes.selectRoot }}
        variant="outlined"
        value={value}
        onChange={e => {
          setValue(e.target.value as LayerKey);
        }}
        defaultValue=""
        select
        label={label}
        disabled={disabled}
        InputProps={{
          classes: {
            focused: classes.focused,
            input: classes.input,
          },
        }}
        InputLabelProps={{
          classes: {
            root: classes.label,
          },
        }}
      >
        {categories.reduce(
          // map wouldn't work here because <Select> doesn't support <Fragment> with keys, so we need one array
          (components, category) => [
            ...components,
            <ListSubheader key={category.title}>
              <Typography variant="body2" color="primary">
                {t(category.title)}
              </Typography>
            </ListSubheader>,
            ...category.layers.map(layer => (
              <MenuItem key={layer.id} value={layer.id}>
                {t(layer.title || '')}
                {getLayerGeometryIcon(layer)}
              </MenuItem>
            )),
          ],
          (placeholder
            ? [
                <MenuItem key={defaultValue} value={defaultValue} disabled>
                  {t(placeholder)}
                </MenuItem>,
              ]
            : []) as ReactElement[],
        )}
      </TextField>
    </FormControl>
  );
}

interface LayerSelectorProps {
  type: LayerType['type'];
  value?: LayerKey;
  label?: string;
  setValue: (val: LayerKey) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}
export default LayerDropdown;
