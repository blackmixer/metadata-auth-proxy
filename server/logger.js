/**
 * Created by ftescht on 18.04.2014.
 */

module.exports = function(runtime) {

	const workerId = runtime && (runtime.common ? 'ram' : (runtime.cluster && runtime.cluster.worker ? runtime.cluster.worker.id : null)),
		workerKey = workerId ? '[worker#'+ workerId +']' : "";

	return function (message, type, args) {
		var time = new Date(),
			logObject = {
				type: (type !== null && type !== undefined) ? type : "info",
				message: message
			};
		if (args !== undefined) {
			try {
				logObject.args = args !== null ? Object.clone(args, true) : null;
			} catch (e) {
				logObject.args = Object.clone(args.toString(), true);
			}
		}

		console[logObject.type === 'error' || message instanceof Error ? 'error' : 'log'](
				time.toISOString() +
				workerKey +
				"[" + logObject.type + "]: "+
      (logObject.message instanceof Error ? logObject.message.message : JSON.stringify(logObject.message))
		);
	};

};
