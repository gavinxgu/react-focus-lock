import * as React from 'react';
import {
  node, bool, string, any, arrayOf, oneOfType, object, func,
} from 'prop-types';
import * as constants from 'focus-lock/constants';
import {useMergeRefs} from 'use-callback-ref';

import {hiddenGuard} from './FocusGuard';
import {mediumFocus, mediumBlur, mediumSidecar} from './medium';
import {useEffect} from "react";

const emptyArray = [];

const FocusLock = React.forwardRef(function FocusLockUI(props, parentRef) {
  const [realObserved, setObserved] = React.useState();
  const observed = React.useRef();
  const isActive = React.useRef(false);
  const originalFocusedElement = React.useRef(null);

  const {
    children,
    disabled,
    noFocusGuards,
    persistentFocus,
    crossFrame,
    autoFocus,
    allowTextSelection,
    group,
    className,
    whiteList,
    shards = emptyArray,
    as: Container = 'div',
    lockProps: containerProps = {},
    sideCar: SideCar,

    returnFocus: shouldReturnFocus,
    focusOptions,

    onActivation: onActivationCallback,
    onDeactivation: onDeactivationCallback,
  } = props;

  const [id] = React.useState({});

  // SIDE EFFECT CALLBACKS

  const onActivation = React.useCallback(() => {
    originalFocusedElement.current = (
      originalFocusedElement.current || (document && document.activeElement)
    );
    if (observed.current && onActivationCallback) {
      onActivationCallback(observed.current);
    }
    isActive.current = true;
  }, [onActivationCallback]);

  const onDeactivation = React.useCallback(() => {
    isActive.current = false;
    if (onDeactivationCallback) {
      onDeactivationCallback(observed.current);
    }
  }, [onDeactivationCallback]);

  useEffect(() => {
    if(!disabled) {
      // cleanup return focus on trap deactivation
      // sideEffect/returnFocus should happen by this time
      originalFocusedElement.current = null;
    }
  }, []);

  const returnFocus = React.useCallback((allowDefer) => {
    const {current: returnFocusTo} = originalFocusedElement;
    if (returnFocusTo && returnFocusTo.focus) {
      const howToReturnFocus = typeof shouldReturnFocus === 'function' ? shouldReturnFocus(returnFocusTo) : shouldReturnFocus;
      if (Boolean(howToReturnFocus)) {
        const returnFocusOptions = typeof howToReturnFocus === 'object' ? howToReturnFocus : undefined;
        originalFocusedElement.current = null;

        if (allowDefer) {
          // React might return focus after update
          // it's safer to defer the action
          Promise.resolve().then(() => returnFocusTo.focus(returnFocusOptions));
        } else {
          returnFocusTo.focus(returnFocusOptions);
        }
      }
    }
  }, [shouldReturnFocus]);

  // MEDIUM CALLBACKS

  const onFocus = React.useCallback((event) => {
    if (containerProps.onFocus) {
      containerProps.onFocus(event);
    }
    if (isActive.current) {
      mediumFocus.useMedium(event);
    }
  }, [containerProps.onFocus]);

  const onBlur = React.useCallback((event) => {
    if (containerProps.onBlur) {
      containerProps.onBlur(event);
    }
    mediumBlur.useMedium(event)
  }, [containerProps.onBlur]);

  // REF PROPAGATION
  // not using real refs due to race conditions

  const setObserveNode = React.useCallback((newObserved) => {
    if (observed.current !== newObserved) {
      observed.current = newObserved;
      setObserved(newObserved);
    }
  }, []);

  if (process.env.NODE_ENV !== 'production') {
    if (typeof allowTextSelection !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('React-Focus-Lock: allowTextSelection is deprecated and enabled by default');
    }

    React.useEffect(() => {
      if (!observed.current) {
        // eslint-disable-next-line no-console
        console.error('FocusLock: could not obtain ref to internal node');
      }
    }, []);
  }

  const lockProps = {
    [constants.FOCUS_DISABLED]: disabled && 'disabled',
    [constants.FOCUS_GROUP]: group,
    ...containerProps,
  };

  const hasLeadingGuards = noFocusGuards !== true;
  const hasTailingGuards = hasLeadingGuards && (noFocusGuards !== 'tail');

  const mergedRef = useMergeRefs([parentRef, setObserveNode]);

  return (
    <React.Fragment>
      {hasLeadingGuards && [
        <div key="guard-first" data-focus-guard tabIndex={disabled ? -1 : 0} style={hiddenGuard}/>, // nearest focus guard
        <div key="guard-nearest" data-focus-guard tabIndex={disabled ? -1 : 1} style={hiddenGuard}/>, // first tabbed element guard
      ]}
      {!disabled && (
        <SideCar
          id={id}
          sideCar={mediumSidecar}
          observed={realObserved}
          disabled={disabled}
          persistentFocus={persistentFocus}
          crossFrame={crossFrame}
          autoFocus={autoFocus}
          whiteList={whiteList}
          shards={shards}
          onActivation={onActivation}
          onDeactivation={onDeactivation}
          returnFocus={returnFocus}
          focusOptions={focusOptions}
        />
      )}
      <Container
        ref={mergedRef}
        {...lockProps}
        className={className}
        onBlur={onBlur}
        onFocus={onFocus}
      >
        {children}
      </Container>
      {
        hasTailingGuards
        && <div data-focus-guard tabIndex={disabled ? -1 : 0} style={hiddenGuard}/>
      }
    </React.Fragment>
  );
});

FocusLock.propTypes = {
  children: node,
  disabled: bool,
  returnFocus: oneOfType([bool, object, func]),
  focusOptions: object,
  noFocusGuards: bool,

  allowTextSelection: bool,
  autoFocus: bool,
  persistentFocus: bool,
  crossFrame: bool,

  group: string,
  className: string,

  whiteList: func,
  shards: arrayOf(any),

  as: oneOfType([string, func, object]),
  lockProps: object,

  onActivation: func,
  onDeactivation: func,

  sideCar: any.isRequired,
};

FocusLock.defaultProps = {
  children: undefined,
  disabled: false,
  returnFocus: false,
  focusOptions: undefined,
  noFocusGuards: false,
  autoFocus: true,
  persistentFocus: false,
  crossFrame: true,
  allowTextSelection: undefined,
  group: undefined,
  className: undefined,
  whiteList: undefined,
  shards: undefined,
  as: 'div',
  lockProps: {},

  onActivation: undefined,
  onDeactivation: undefined,
};

export default FocusLock;
