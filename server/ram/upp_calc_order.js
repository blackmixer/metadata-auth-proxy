/**
 *
 *
 * @module upp_calc_order
 *
 * Created by Evgeniy Malyarov on 06.08.2020.
 */

const fetch = require('node-fetch');

module.exports = function upp_calc_order($p, log) {

  const {utils, job_prm: {server: {upp}}} = $p;

  // здесь храним экземпляры res для отложенных ответов
  const callbacks = {};

  // async запрос к 1С
  const query_1c = (order_id, cbid) => {
	const body = {
        order_id,
        CallBackLink: {
          server: upp.cbserver,
          port: upp.cbport,
          login: "",
          password: "",
          link: `/couchdb/common/upp_calc_order/${cbid}`,
        }
      };
	  
	log({...upp, ...body});
	
    return fetch(upp.url, {
      method: 'POST',
      headers: cache.headers,
      body: JSON.stringify(body),
    })
      .then(res => {
        if(res.status > 201) {
          throw new Error(`Ошибка сервера 1С '${res.statusText}'`);
        }
        return res.json();
      })
	  .then(body => {
		  log(body);
		  return body;
	  });

  };

  // поддерживает актуальным кеш дат из 1С
  const watchdog = () => {
    clearTimeout(cache.timer);
    cache.timer = setTimeout(watchdog, 30000);
    if(cache.is_actual() || cache.querying) {
      return;
    }
    cache.querying = utils.generate_guid().replace(/-/g, '');
    query_1c(upp.order, cache.querying)
      .then((body) => {
        callbacks[cache.querying] = {
          end() {
            cache.querying = false;
          }
        };
        setTimeout(() => {
          const cb = callbacks[cache.querying];
          if(cb) {
            delete callbacks[cache.querying];
            cb.end('');
          }
        }, 10000);
      })
      .catch((err) => cache.querying = false);
  };

  // здесь храним даты последнего расчета, чтобы сократить общение с 1С
  const cache = {
    moment: 0,
    timer: setTimeout(watchdog, 70000),
    manufacture_date: new Date(),
    querying: false,
    is_actual() {
      return (this.manufacture_date > new Date()) && (Date.now() - this.moment < 300000);
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${upp.username}:${upp.password}`).toString('base64')}`,
    },
  };

  return async function calc_order({req, res}) {

    const {parsed, query, body} = req;
    res.setHeader('Content-Type', 'application/json');

    let cbid = parsed.paths[2];
	
	if(!body) {
	  return res.end(JSON.stringify({error: true, reason: 'empty body'}));
	}

	log(body);   
    if(cbid) {
      const cb = callbacks[cbid];
      if(cb) {
        delete callbacks[cbid];
        cb.end(JSON.stringify(body));
        res.end(JSON.stringify({ok: true}));
        cache.manufacture_date = new Date(body.manufacture_date);
        cache.moment = Date.now();
        if(cbid === cache.querying) {
          cache.querying = false;
        }
      }
      else {
        res.end(JSON.stringify({error: true, reason: 'no cbid in callbacks'}));
      }
    }
    else {

      if(body.use_cache && (cache.is_actual() || cache.querying)) {
        return res.end(JSON.stringify({
          ok: true,
          manufacture_date: cache.manufacture_date,
        }));
      }

      cbid = utils.generate_guid().replace(/-/g, '');
      // делаем запрос к УПП
      return query_1c(body.ref, cbid)
        .then((body) => {
          callbacks[cbid] = res;
          setTimeout(() => {
            const cb = callbacks[cbid];
            if(cb) {
              delete callbacks[cbid];
              cb.statusCode = 500;
              cb.end(JSON.stringify({
                error: true,
                message: 'Сервер 1С не отвечает, повторите запрос позже',
              }));
            }
          }, 30000);
        })
        .catch((err) => {
          res.statusCode = 500;
          res.end(JSON.stringify({
            error: true,
            message: err.message,
          }));
        });

    }

  };

}




