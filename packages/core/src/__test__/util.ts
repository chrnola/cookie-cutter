/*
Copyright (c) Walmart Inc.

This source code is licensed under the Apache 2.0 license found in the
LICENSE file in the root directory of this source tree.
*/

import {
    Application,
    cached,
    CapturingOutputSink,
    ErrorHandlingMode,
    EventSourcedStateProvider,
    IClassType,
    IMessage,
    InMemoryStateAggregationSource,
    InMemoryStateOutputSink,
    IPublishedMessage,
    IState,
    ParallelismMode,
    StaticInputSource,
} from "..";

export async function runStatefulApp<TState extends IState<TSnapshot>, TSnapshot>(
    TState: IClassType<TState>,
    aggregator: any,
    streams: Map<string, IMessage[]>,
    input: IMessage[],
    dispatchTarget: any,
    mode: ParallelismMode,
    errorMode: ErrorHandlingMode = ErrorHandlingMode.LogAndFail
): Promise<IMessage[]> {
    const capture: IPublishedMessage[] = [];

    await Application.create()
        .input()
        .add(new StaticInputSource(input))
        .done()
        .dispatch(dispatchTarget)
        .state(
            cached(
                TState,
                new EventSourcedStateProvider(
                    TState,
                    aggregator,
                    new InMemoryStateAggregationSource(streams)
                )
            )
        )
        .output()
        .published(new CapturingOutputSink(capture))
        .stored(new InMemoryStateOutputSink(streams))
        .done()
        .run(errorMode, mode);

    return capture.map((m) => m.message);
}

export async function runStatelessApp(
    input: IMessage[],
    dispatchTarget: any,
    mode: ParallelismMode
): Promise<IMessage[]> {
    const capture: IPublishedMessage[] = [];

    await Application.create()
        .input()
        .add(new StaticInputSource(input))
        .done()
        .dispatch(dispatchTarget)
        .output()
        .published(new CapturingOutputSink(capture))
        .done()
        .run(ErrorHandlingMode.LogAndFail, mode);

    return capture.map((m) => m.message);
}
